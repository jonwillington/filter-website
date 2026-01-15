'use client';

import { createContext, useContext, useState, useMemo, useCallback, ReactNode } from 'react';
import { Shop, Location } from '@/lib/types';
import { UserPreferences } from '@/lib/types/auth';
import { hasCityAreaRecommendation } from '@/lib/utils';
import { filterShopsByLocation } from '@/lib/utils/shopFiltering';

export type ShopFilterType = 'all' | 'topPicks' | 'working' | 'interior' | 'brewing';

interface FilterContextType {
  // State
  shopFilter: ShopFilterType;
  applyMyFilters: boolean;
  isFilterLoading: boolean;

  // Computed values
  sidebarShops: Shop[];
  shopsForMap: Shop[];
  shopMatchInfo: Map<string, string[]>;
  totalFilterCount: number;

  // Actions
  setShopFilter: (filter: ShopFilterType) => void;
  setApplyMyFilters: (value: boolean) => void;
  setIsFilterLoading: (value: boolean) => void;
}

const FilterContext = createContext<FilterContextType | null>(null);

interface FilterProviderProps {
  children: ReactNode;
  shops: Shop[];
  selectedLocation: Location | null;
  userPreferences?: UserPreferences;
}

export function FilterProvider({
  children,
  shops,
  selectedLocation,
  userPreferences,
}: FilterProviderProps) {
  const [shopFilter, setShopFilter] = useState<ShopFilterType>('all');
  const [applyMyFilters, setApplyMyFilters] = useState(false);
  const [isFilterLoading, setIsFilterLoading] = useState(false);

  // Helper functions for preference matching
  const shopMatchesTags = useCallback((shop: Shop, preferredTags: string[]): boolean => {
    if (preferredTags.length === 0) return true;
    const shopTags = (shop as any).public_tags || [];
    if (!Array.isArray(shopTags) || shopTags.length === 0) return false;
    const shopTagsLower = shopTags.map((t: string) => t.toLowerCase());
    return preferredTags.some(tag => shopTagsLower.includes(tag.toLowerCase()));
  }, []);

  const shopMatchesBrewMethods = useCallback((shop: Shop, preferredMethods: string[]): boolean => {
    if (preferredMethods.length === 0) return true;
    const anyShop = shop as any;
    const brand = anyShop.brand || {};
    return preferredMethods.some(method => {
      const field = `has_${method}`;
      return anyShop[field] === true || brand[field] === true;
    });
  }, []);

  const getShopMatches = useCallback((shop: Shop, preferredTags: string[], preferredBrewMethods: string[]): string[] => {
    const matches: string[] = [];
    const anyShop = shop as any;
    const brand = anyShop.brand || {};

    preferredBrewMethods.forEach(method => {
      const field = `has_${method}`;
      if (anyShop[field] === true || brand[field] === true) {
        const formatted = method === 'v60' ? 'V60'
          : method === 'aeropress' ? 'AeroPress'
          : method.charAt(0).toUpperCase() + method.slice(1).replace(/_/g, ' ');
        matches.push(formatted);
      }
    });

    const shopTags = anyShop.public_tags || [];
    if (Array.isArray(shopTags)) {
      const shopTagsLower = shopTags.map((t: string) => t.toLowerCase());
      preferredTags.forEach(tag => {
        if (shopTagsLower.includes(tag.toLowerCase())) {
          matches.push(`tag:${tag}`);
        }
      });
    }

    return matches;
  }, []);

  // Filter shops for sidebar based on selected location
  const locationFilteredShops = useMemo(
    () => filterShopsByLocation(shops, selectedLocation),
    [shops, selectedLocation]
  );

  // Filter shops based on user preferences and selected filter
  const { sidebarShops, shopMatchInfo, totalFilterCount } = useMemo(() => {
    let filtered = locationFilteredShops;
    const matchInfo = new Map<string, string[]>();
    let filterCount = 0;

    if (applyMyFilters && userPreferences) {
      const preferIndependent = userPreferences.preferIndependentOnly;
      const preferredTags = userPreferences.preferredTags || [];
      const preferredBrewMethods = userPreferences.preferredBrewMethods || [];
      const hasPreferences = preferredTags.length > 0 || preferredBrewMethods.length > 0;

      filterCount = preferredTags.length + preferredBrewMethods.length;

      if (preferIndependent) {
        filtered = filtered.filter((shop) => {
          return shop.independent === true || shop.is_chain === false;
        });
      }

      const preferRoastsOwnBeans = userPreferences.preferRoastsOwnBeans;
      if (preferRoastsOwnBeans) {
        filtered = filtered.filter((shop) => {
          const brand = (shop as any).brand;
          return brand?.roastOwnBeans === true;
        });
      }

      if (hasPreferences) {
        filtered = filtered.filter((shop) => {
          const matches = getShopMatches(shop, preferredTags, preferredBrewMethods);
          if (matches.length > 0) {
            matchInfo.set(shop.documentId, matches);
            return true;
          }
          return false;
        });

        filtered.sort((a, b) => {
          const aMatches = matchInfo.get(a.documentId)?.length || 0;
          const bMatches = matchInfo.get(b.documentId)?.length || 0;
          return bMatches - aMatches;
        });
      }

      return { sidebarShops: filtered, shopMatchInfo: matchInfo, totalFilterCount: filterCount };
    }

    if (shopFilter === 'all') return { sidebarShops: filtered, shopMatchInfo: matchInfo, totalFilterCount: 0 };

    const dropdownFiltered = filtered.filter((shop) => {
      const anyShop = shop as any;
      switch (shopFilter) {
        case 'topPicks':
          return hasCityAreaRecommendation(shop);
        case 'working':
          return anyShop.workingRec === true || anyShop.working_rec === true || anyShop.workingrec === true;
        case 'interior':
          return anyShop.interiorRec === true || anyShop.interior_rec === true || anyShop.interiorrec === true;
        case 'brewing':
          return anyShop.brewingRec === true || anyShop.brewing_rec === true || anyShop.brewingrec === true;
        default:
          return true;
      }
    });

    return { sidebarShops: dropdownFiltered, shopMatchInfo: matchInfo, totalFilterCount: 0 };
  }, [locationFilteredShops, shopFilter, applyMyFilters, userPreferences, getShopMatches]);

  // Map shows filtered shops when filter is active or "apply my filters" is on
  const shopsForMap = useMemo(() => {
    let mapShops = shops;

    if (applyMyFilters && userPreferences) {
      const preferIndependent = userPreferences.preferIndependentOnly;
      const preferredTags = userPreferences.preferredTags || [];
      const preferredBrewMethods = userPreferences.preferredBrewMethods || [];
      const hasPreferences = preferredTags.length > 0 || preferredBrewMethods.length > 0;

      if (preferIndependent) {
        mapShops = mapShops.filter((shop) => {
          return shop.independent === true || shop.is_chain === false;
        });
      }

      const preferRoastsOwnBeans = userPreferences.preferRoastsOwnBeans;
      if (preferRoastsOwnBeans) {
        mapShops = mapShops.filter((shop) => {
          const brand = (shop as any).brand;
          return brand?.roastOwnBeans === true;
        });
      }

      if (hasPreferences) {
        mapShops = mapShops.filter((shop) => {
          const matchesTags = preferredTags.length === 0 || shopMatchesTags(shop, preferredTags);
          const matchesMethods = preferredBrewMethods.length === 0 || shopMatchesBrewMethods(shop, preferredBrewMethods);
          return matchesTags || matchesMethods;
        });
      }
    }

    if (selectedLocation && shopFilter !== 'all' && !applyMyFilters) {
      return sidebarShops;
    }

    return mapShops;
  }, [shops, sidebarShops, selectedLocation, shopFilter, applyMyFilters, userPreferences, shopMatchesTags, shopMatchesBrewMethods]);

  const value: FilterContextType = {
    shopFilter,
    applyMyFilters,
    isFilterLoading,
    sidebarShops,
    shopsForMap,
    shopMatchInfo,
    totalFilterCount,
    setShopFilter,
    setApplyMyFilters,
    setIsFilterLoading,
  };

  return (
    <FilterContext.Provider value={value}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilterContext() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilterContext must be used within a FilterProvider');
  }
  return context;
}
