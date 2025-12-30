'use client';

import { LocationSelector } from './LocationSelector';
import { ShopList } from './ShopList';
import { Location, Shop } from '@/lib/types';
import { cn } from '@/lib/utils';
import { SegmentedControl } from '../ui/SegmentedControl';
import { useMemo } from 'react';

interface SidebarProps {
  locations: Location[];
  selectedLocation: Location | null;
  onLocationChange: (location: Location | null) => void;
  shops: Shop[];
  allShops?: Shop[]; // Unfiltered shops for counting
  selectedShop: Shop | null;
  onShopSelect: (shop: Shop) => void;
  isNearbyMode: boolean;
  onNearbyToggle: () => void;
  isLoading?: boolean;
  isOpen?: boolean;
  showTopRecommendations?: boolean;
  onTopRecommendationsChange?: (value: boolean) => void;
}

export function Sidebar({
  locations,
  selectedLocation,
  onLocationChange,
  shops,
  allShops,
  selectedShop,
  onShopSelect,
  isNearbyMode,
  onNearbyToggle,
  isLoading,
  isOpen = true,
  showTopRecommendations = false,
  onTopRecommendationsChange,
}: SidebarProps) {
  // Count shops for segmented control labels
  const { topPicksCount, allCount } = useMemo(() => {
    const shopsToCount = allShops || shops;
    const allCount = shopsToCount.length;
    const topPicksCount = shopsToCount.filter((shop) => {
      const anyShop = shop as any;
      return (
        anyShop.cityAreaRec === true ||
        anyShop.city_area_rec === true ||
        anyShop.cityarearec === true
      );
    }).length;

    return { topPicksCount, allCount };
  }, [allShops, shops]);

  // Only show segmented control when there are enough shops and some are top picks
  const shouldShowSegments = selectedLocation && onTopRecommendationsChange && allCount >= 5 && topPicksCount > 0;

  return (
    <aside className={cn('sidebar', isOpen && 'open')}>
      <div className="sidebar-header">
        <h1 className="text-2xl font-bold text-contrastBlock mb-4">Filter</h1>
        <LocationSelector
          locations={locations}
          selectedLocation={selectedLocation}
          onLocationChange={onLocationChange}
          isNearbyMode={isNearbyMode}
          onNearbyToggle={onNearbyToggle}
        />
        {shouldShowSegments && (
          <div className="mt-4 flex justify-center">
            <SegmentedControl
              segments={[
                { key: 'topPicks', label: `Top Picks (${topPicksCount})` },
                { key: 'all', label: `All (${allCount})` },
              ]}
              activeSegment={showTopRecommendations ? 'topPicks' : 'all'}
              onSegmentChange={(key) => onTopRecommendationsChange(key === 'topPicks')}
            />
          </div>
        )}
      </div>

      <div className="sidebar-content">
        <ShopList
          shops={shops}
          selectedShop={selectedShop}
          onShopSelect={onShopSelect}
          isLoading={isLoading}
        />
      </div>
    </aside>
  );
}
