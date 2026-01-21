'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Sidebar, ShopFilterType } from '../sidebar/Sidebar';

// Dynamic import to prevent mapbox-gl from being bundled server-side (uses eval)
const MapContainer = dynamic(
  () => import('../map/MapContainer').then(mod => ({ default: mod.MapContainer })),
  { ssr: false, loading: () => <div className="flex-1 bg-surface animate-pulse" /> }
);
import { ShopDrawer, LocationDrawer, UnifiedDrawer } from '../detail';
import { Footer } from './Footer';
import { UserMenu } from '../auth/UserMenu';
import { useAuth } from '@/lib/context/AuthContext';
import { useShopData } from '@/lib/context/ShopDataContext';
import { Location, Shop, Country, CityArea, Event, Critic } from '@/lib/types';
import { cn, slugify, getShopSlug, hasCityAreaRecommendation, getShopCoordinates } from '@/lib/utils';
import { useGeolocation } from '@/lib/hooks/useGeolocation';
import { filterShopsByLocation } from '@/lib/utils/shopFiltering';
import { detectUserArea, reverseGeocode } from '@/lib/api/geolocation';
import { Button } from '@heroui/react';
import { Menu, LogIn, Search, MapPin, SlidersHorizontal } from 'lucide-react';
import { CircularCloseButton } from '../ui/CircularCloseButton';

// Dynamic imports for modals to reduce initial bundle size
const WelcomeModal = dynamic(
  () => import('../modals/WelcomeModal').then(mod => ({ default: mod.WelcomeModal })),
  { ssr: false }
);
const SearchModal = dynamic(
  () => import('../modals/SearchModal').then(mod => ({ default: mod.SearchModal })),
  { ssr: false }
);
const LoginModal = dynamic(
  () => import('../auth/LoginModal').then(mod => ({ default: mod.LoginModal })),
  { ssr: false }
);
const ExploreModal = dynamic(
  () => import('../modals/ExploreModal').then(mod => ({ default: mod.ExploreModal })),
  { ssr: false }
);
const FilterPreferencesModal = dynamic(
  () => import('../modals/FilterPreferencesModal').then(mod => ({ default: mod.FilterPreferencesModal })),
  { ssr: false }
);
const SettingsModal = dynamic(
  () => import('../modals/SettingsModal').then(mod => ({ default: mod.SettingsModal })),
  { ssr: false }
);
const UnsupportedCountryModal = dynamic(
  () => import('../modals/UnsupportedCountryModal').then(mod => ({ default: mod.UnsupportedCountryModal })),
  { ssr: false }
);
const LocationBlockedModal = dynamic(
  () => import('../modals/LocationBlockedModal').then(mod => ({ default: mod.LocationBlockedModal })),
  { ssr: false }
);

interface MainLayoutProps {
  locations: Location[];
  initialLocation?: Location | null;
  shops: Shop[];
  initialShop?: Shop | null;
  countries?: Country[];
  cityAreas?: CityArea[];
  events?: Event[];
  critics?: Critic[];
}

export function MainLayout({
  locations,
  initialLocation = null,
  shops,
  initialShop = null,
  countries = [],
  cityAreas: propCityAreas = [],
  events = [],
  critics = [],
}: MainLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Use cached shop data for stable reference (prevents map marker recreation on navigation)
  const shopData = useShopData();
  const hasHydratedRef = useRef(false);

  // Hydrate the shop data context with server-side props (only once)
  useEffect(() => {
    if (!hasHydratedRef.current && shops.length > 0) {
      shopData.hydrate({
        shops,
        locations,
        countries,
        cityAreas: propCityAreas,
        events,
        critics,
      });
      hasHydratedRef.current = true;
    }
  }, [shops, locations, countries, propCityAreas, events, critics, shopData]);

  // Use cached data if available, otherwise fall back to props
  const cachedShops = shopData.isHydrated && shopData.shops.length > 0 ? shopData.shops : shops;
  const cachedLocations = shopData.isHydrated && shopData.locations.length > 0 ? shopData.locations : locations;
  const cachedCountries = shopData.isHydrated && shopData.countries.length > 0 ? shopData.countries : countries;
  const cachedCityAreas = shopData.isHydrated && shopData.cityAreas.length > 0 ? shopData.cityAreas : propCityAreas;
  const cachedEvents = shopData.isHydrated && shopData.events.length > 0 ? shopData.events : events;
  const cachedCritics = shopData.isHydrated && shopData.critics.length > 0 ? shopData.critics : critics;

  const [selectedLocation, setSelectedLocation] = useState<Location | null>(initialLocation);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(initialShop);
  const [shopHistory, setShopHistory] = useState<Shop[]>([]); // Track shop navigation history
  const [isNearbyMode, setIsNearbyMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [shopFilter, setShopFilter] = useState<ShopFilterType>('all');
  const [isFilterLoading, setIsFilterLoading] = useState(false);
  const [applyMyFilters, setApplyMyFilters] = useState(false);
  const prevShopFilterRef = useRef<ShopFilterType>('all');
  const [isExploreMode, setIsExploreMode] = useState(!initialLocation);
  const [isAreaUnsupported, setIsAreaUnsupported] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([0, 20]);
  const [mapZoom, setMapZoom] = useState<number>(2);
  const [unsupportedCountry, setUnsupportedCountry] = useState<{ name: string; code: string } | null>(null);
  const [showUnsupportedCountryModal, setShowUnsupportedCountryModal] = useState(false);
  const [emptySupportedCountry, setEmptySupportedCountry] = useState<{ name: string; code: string } | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showMobileCityGuide, setShowMobileCityGuide] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showExploreModal, setShowExploreModal] = useState(false);
  const [showFilterPreferencesModal, setShowFilterPreferencesModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isLocationDrawerClosing, setIsLocationDrawerClosing] = useState(false);
  const [expandedCityAreaId, setExpandedCityAreaId] = useState<string | null>(null);

  const { coordinates, requestLocation, isPermissionBlocked, clearPermissionBlocked } = useGeolocation();
  const { user, userProfile, loading: authLoading } = useAuth();

  // Track desktop/mobile viewport
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    // Initial check
    checkDesktop();

    // Listen for resize
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Track previous initialShop to detect shop-to-shop transitions
  const prevInitialShopRef = useRef<Shop | null>(null);
  // Track previous initialLocation to prevent duplicate map animations
  const prevInitialLocationRef = useRef<Location | null>(null);
  // Track location ID when navigating via handleLocationChange to skip redundant recalculation
  const navigationLocationIdRef = useRef<string | null>(null);

  // Helper to get shop coordinates (uses imported utility)
  const getShopCoords = (shop: Shop): { lng: number; lat: number } | null => {
    const coords = getShopCoordinates(shop);
    return coords ? { lng: coords[0], lat: coords[1] } : null;
  };

  // Initialize/update map position based on initial state
  useEffect(() => {
    if (initialShop) {
      const coords = getShopCoords(initialShop);
      if (coords) {
        setMapCenter([coords.lng, coords.lat]);
        // Zoom in to shop level while showing surrounding context
        if (!prevInitialShopRef.current) {
          setMapZoom(14);
        }
      }
      prevInitialShopRef.current = initialShop;
      prevInitialLocationRef.current = initialLocation;
    } else if (initialLocation && shops.length > 0) {
      // Only update map if location actually changed
      if (prevInitialLocationRef.current?.documentId !== initialLocation.documentId) {
        // Skip recalculation if handleLocationChange already set the coordinates
        if (navigationLocationIdRef.current === initialLocation.documentId) {
          navigationLocationIdRef.current = null;
          prevInitialLocationRef.current = initialLocation;
          return;
        }
        const locationShops = shops.filter(s =>
          s.location?.documentId === initialLocation.documentId ||
          s.city_area?.location?.documentId === initialLocation.documentId
        );
        const validShops = locationShops.filter((s) => getShopCoords(s));
        if (validShops.length > 0) {
          const avgLng =
            validShops.reduce((sum, s) => sum + (getShopCoords(s)?.lng ?? 0), 0) /
            validShops.length;
          const avgLat =
            validShops.reduce((sum, s) => sum + (getShopCoords(s)?.lat ?? 0), 0) /
            validShops.length;
          setMapCenter([avgLng, avgLat]);
          setMapZoom(12);
        }
        prevInitialLocationRef.current = initialLocation;
      }
      prevInitialShopRef.current = null;
    } else {
      // Explore mode - world view
      setMapCenter([0, 20]);
      setMapZoom(2);
      prevInitialShopRef.current = null;
      prevInitialLocationRef.current = null;
    }
  }, [initialShop, initialLocation, shops]); // Update when initialShop changes

  // Update map center and zoom when selectedShop changes (for same-location navigation via pushState)
  const MIN_SHOP_ZOOM = 14;
  useEffect(() => {
    if (selectedShop && selectedShop.documentId !== initialShop?.documentId) {
      const coords = getShopCoords(selectedShop);
      if (coords) {
        setMapCenter([coords.lng, coords.lat]);
        // Only zoom in if currently zoomed out - don't zoom out if user has zoomed in further
        if (mapZoom < MIN_SHOP_ZOOM) {
          setMapZoom(MIN_SHOP_ZOOM);
        }
      }
    }
  }, [selectedShop, initialShop, mapZoom]);

  // Detect if user is in a supported area when coordinates are received
  useEffect(() => {
    // Only run when we have coordinates and we're in explore mode (waiting for nearby detection)
    // isLoading indicates we're actively waiting for location detection
    if (!coordinates || !isExploreMode || !isLoading) return;

    const checkArea = async () => {
      const areaData = await detectUserArea(coordinates.lat, coordinates.lng);

      if (areaData?.area) {
        // User is in a supported area - find and select the corresponding location
        const matchedLocation = locations.find(
          (loc) => loc.documentId === areaData.area?.location?.documentId
        );

        if (matchedLocation) {
          // Calculate center for the matched location's shops
          const locationShops = shops.filter(s =>
            s.location?.documentId === matchedLocation.documentId ||
            s.city_area?.location?.documentId === matchedLocation.documentId
          );
          const validShops = locationShops.filter((s) => getShopCoords(s));

          if (validShops.length > 0) {
            const avgLng = validShops.reduce((sum, s) => sum + (getShopCoords(s)?.lng ?? 0), 0) / validShops.length;
            const avgLat = validShops.reduce((sum, s) => sum + (getShopCoords(s)?.lat ?? 0), 0) / validShops.length;
            // Start the map flying immediately
            setMapCenter([avgLng, avgLat]);
            setMapZoom(12);
          }

          // Smoothly transition to the supported city
          setIsAreaUnsupported(false);
          setIsExploreMode(false);
          setIsNearbyMode(false); // Exit nearby mode
          setShopFilter('all');

          // Delay setting the location to sync with the map animation start
          setTimeout(() => {
            setSelectedLocation(matchedLocation);

            // Update URL without server round-trip (shallow routing)
            const countrySlug = slugify(matchedLocation.country?.name ?? '');
            const citySlug = slugify(matchedLocation.name);
            window.history.pushState(null, '', `/${countrySlug}/${citySlug}`);
          }, 300);
        } else {
          // Area detected but location not in our list
          setSelectedLocation(null); // Clear location when unsupported
          setIsNearbyMode(true);
          setIsExploreMode(false);
          setIsAreaUnsupported(true);
          setIsLoading(false); // Stop loading
          // Center on user location
          setMapCenter([coordinates.lng, coordinates.lat]);
          setMapZoom(12);

          // Detect country and show unsupported modal
          const countryData = await reverseGeocode(coordinates.lat, coordinates.lng);
          if (countryData) {
            setUnsupportedCountry({ name: countryData.country, code: countryData.countryCode });
          }
        }
      } else {
        // No supported area detected - show nearby shops and detect country
        setSelectedLocation(null); // Clear location when unsupported
        setIsNearbyMode(true);
        setIsExploreMode(false);
        setIsAreaUnsupported(true);
        setIsLoading(false); // Stop loading
        // Center on user location
        setMapCenter([coordinates.lng, coordinates.lat]);
        setMapZoom(12);

        // Detect country and show unsupported modal
        const countryData = await reverseGeocode(coordinates.lat, coordinates.lng);
        if (countryData) {
          setUnsupportedCountry({ name: countryData.country, code: countryData.countryCode });
        }
      }
    };

    checkArea();
  }, [coordinates, isExploreMode, isLoading, locations, router, shops]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  // Clear loading state when location permission is blocked
  useEffect(() => {
    if (isPermissionBlocked && isLoading) {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      setIsLoading(false);
    }
  }, [isPermissionBlocked, isLoading]);

  // Handle browser back/forward navigation (popstate)
  // Since we use shallow routing (pushState), we need to sync state when URL changes
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const segments = path.split('/').filter(Boolean);

      if (segments.length === 0) {
        // Root path - explore mode
        setSelectedLocation(null);
        setSelectedShop(null);
        setIsExploreMode(true);
        setIsNearbyMode(false);
        setMapCenter([0, 20]);
        setMapZoom(2);
        return;
      }

      // Try to match location from URL: /{country}/{city}
      if (segments.length >= 2) {
        const [countrySlug, citySlug] = segments;
        const matchedLocation = cachedLocations.find(
          (loc) =>
            slugify(loc.country?.name ?? '') === countrySlug &&
            slugify(loc.name) === citySlug
        );

        if (matchedLocation) {
          setSelectedLocation(matchedLocation);
          setIsExploreMode(false);
          setIsNearbyMode(false);

          // If 4 segments, try to match shop: /{country}/{city}/{area}/{shop}
          if (segments.length >= 4) {
            const shopSlug = segments[3];
            const matchedShop = cachedShops.find(
              (shop) =>
                getShopSlug(shop) === shopSlug &&
                (shop.location?.documentId === matchedLocation.documentId ||
                  shop.city_area?.location?.documentId === matchedLocation.documentId)
            );

            if (matchedShop) {
              setSelectedShop(matchedShop);
              const coords = getShopCoordinates(matchedShop);
              if (coords) {
                setMapCenter([coords[0], coords[1]]);
                setMapZoom(14);
              }
              return;
            }
          }

          // Location only - clear shop, center on location
          setSelectedShop(null);
          setShopHistory([]);
          const locationShops = cachedShops.filter(
            (s) =>
              s.location?.documentId === matchedLocation.documentId ||
              s.city_area?.location?.documentId === matchedLocation.documentId
          );
          const validShops = locationShops.filter((s) => getShopCoordinates(s));
          if (validShops.length > 0) {
            const avgLng =
              validShops.reduce((sum, s) => sum + (getShopCoordinates(s)?.[0] ?? 0), 0) /
              validShops.length;
            const avgLat =
              validShops.reduce((sum, s) => sum + (getShopCoordinates(s)?.[1] ?? 0), 0) /
              validShops.length;
            setMapCenter([avgLng, avgLat]);
            setMapZoom(12);
          }
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [cachedLocations, cachedShops]);

  // Sync state with props - only update if the ID actually changed
  // This prevents double-renders when navigating between shops
  useEffect(() => {
    setSelectedLocation((prev) => {
      if (prev?.documentId === initialLocation?.documentId) {
        return prev; // Keep same reference to avoid re-render
      }
      return initialLocation;
    });
  }, [initialLocation]);

  useEffect(() => {
    setSelectedShop((prev) => {
      if (prev?.documentId === initialShop?.documentId) {
        return prev; // Keep same reference to avoid re-render
      }
      return initialShop;
    });
  }, [initialShop]);

  const handleLocationChange = useCallback(
    (location: Location | null) => {
      // Clear any existing timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }

      // Start loading transition - spinner fades in
      setIsLoading(true);
      setSelectedShop(null);
      setIsNearbyMode(false);
      setIsExploreMode(false);
      setShopFilter('all');

      // Set location state first to ensure consistency
      setSelectedLocation(location);

      // Calculate map center from shop positions (same as initial page load)
      if (location) {
        const locationShops = cachedShops.filter(s =>
          s.location?.documentId === location.documentId ||
          s.city_area?.location?.documentId === location.documentId
        );
        const validShops = locationShops.filter((s) => getShopCoords(s));

        if (validShops.length > 0) {
          const avgLng = validShops.reduce((sum, s) => sum + (getShopCoords(s)?.lng ?? 0), 0) / validShops.length;
          const avgLat = validShops.reduce((sum, s) => sum + (getShopCoords(s)?.lat ?? 0), 0) / validShops.length;
          navigationLocationIdRef.current = location.documentId;
          setMapCenter([avgLng, avgLat]);
          setMapZoom(12);
        } else if (location.coordinates) {
          // Fallback to location coordinates if no shops
          const coords = Array.isArray(location.coordinates) ? location.coordinates[0] : location.coordinates;
          if (coords && 'lat' in coords && 'lng' in coords) {
            navigationLocationIdRef.current = location.documentId;
            setMapCenter([coords.lng, coords.lat]);
            setMapZoom(12);
          }
        }
      } else {
        // Explore mode - world view
        setMapCenter([0, 20]);
        setMapZoom(2);
      }

      // Update URL without server round-trip (shallow routing)
      // State is already updated above, so just sync the URL
      if (location) {
        const countrySlug = slugify(location.country?.name ?? '');
        const citySlug = slugify(location.name);
        window.history.pushState(null, '', `/${countrySlug}/${citySlug}`);
      } else {
        window.history.pushState(null, '', '/');
      }

      // Set a timeout fallback to ensure loading doesn't take too long
      // Map's onTransitionComplete will clear this if it finishes first
      loadingTimeoutRef.current = setTimeout(() => {
        setIsLoading(false);
        loadingTimeoutRef.current = null;
      }, 2000); // Maximum 2 seconds
    },
    [router, cachedShops]
  );

  // Note: hasCityAreaRecommendation is imported from @/lib/utils

  // Filter shops for sidebar based on selected location (uses imported utility)
  // Use cachedShops for stable reference (prevents marker recreation on navigation)
  const locationFilteredShops = useMemo(
    () => filterShopsByLocation(cachedShops, selectedLocation),
    [cachedShops, selectedLocation]
  );

  // Helper to check if shop matches user's tag preferences
  const shopMatchesTags = useCallback((shop: Shop, preferredTags: string[]): boolean => {
    if (preferredTags.length === 0) return true;
    const shopTags = (shop as any).public_tags || [];
    if (!Array.isArray(shopTags) || shopTags.length === 0) return false;
    const shopTagsLower = shopTags.map((t: string) => t.toLowerCase());
    return preferredTags.some(tag => shopTagsLower.includes(tag.toLowerCase()));
  }, []);

  // Helper to check if shop matches user's brew method preferences
  const shopMatchesBrewMethods = useCallback((shop: Shop, preferredMethods: string[]): boolean => {
    if (preferredMethods.length === 0) return true;
    const anyShop = shop as any;
    const brand = anyShop.brand || {};
    return preferredMethods.some(method => {
      const field = `has_${method}`;
      return anyShop[field] === true || brand[field] === true;
    });
  }, []);

  // Helper to get matching filters for a shop
  const getShopMatches = useCallback((shop: Shop, preferredTags: string[], preferredBrewMethods: string[]): string[] => {
    const matches: string[] = [];
    const anyShop = shop as any;
    const brand = anyShop.brand || {};

    // Check brew methods
    preferredBrewMethods.forEach(method => {
      const field = `has_${method}`;
      if (anyShop[field] === true || brand[field] === true) {
        // Format method name nicely
        const formatted = method === 'v60' ? 'V60'
          : method === 'aeropress' ? 'AeroPress'
          : method.charAt(0).toUpperCase() + method.slice(1).replace(/_/g, ' ');
        matches.push(formatted);
      }
    });

    // Check tags
    const shopTags = anyShop.public_tags || [];
    if (Array.isArray(shopTags)) {
      const shopTagsLower = shopTags.map((t: string) => t.toLowerCase());
      preferredTags.forEach(tag => {
        if (shopTagsLower.includes(tag.toLowerCase())) {
          // We'll resolve tag labels in ShopCard via the tags lookup
          matches.push(`tag:${tag}`);
        }
      });
    }

    return matches;
  }, []);

  // Filter shops based on user preferences and selected filter (for sidebar)
  // Also calculates match info when applyMyFilters is on
  const { sidebarShops, shopMatchInfo, totalFilterCount } = useMemo(() => {
    let filtered = locationFilteredShops;
    const matchInfo = new Map<string, string[]>();
    let filterCount = 0;

    // Only apply user preference filters when "apply my filters" toggle is ON
    if (applyMyFilters) {
      const preferences = userProfile?.preferences;
      const preferIndependent = preferences?.preferIndependentOnly;
      const preferredTags = preferences?.preferredTags || [];
      const preferredBrewMethods = preferences?.preferredBrewMethods || [];
      const hasPreferences = preferredTags.length > 0 || preferredBrewMethods.length > 0;

      // Calculate total filter count (tags + brew methods)
      filterCount = preferredTags.length + preferredBrewMethods.length;

      // Apply independent shops filter - only keep shops explicitly marked as independent
      if (preferIndependent) {
        filtered = filtered.filter((shop) => {
          // Keep shops that are explicitly independent OR explicitly not a chain
          return shop.independent === true || shop.is_chain === false;
        });
      }

      // Apply roasts own beans filter
      const preferRoastsOwnBeans = preferences?.preferRoastsOwnBeans;
      if (preferRoastsOwnBeans) {
        filtered = filtered.filter((shop) => {
          const brand = (shop as any).brand;
          return brand?.roastOwnBeans === true;
        });
      }

      // Apply tag and brew method preferences (OR logic - match ANY)
      // And calculate match info for each shop
      if (hasPreferences) {
        filtered = filtered.filter((shop) => {
          const matches = getShopMatches(shop, preferredTags, preferredBrewMethods);
          if (matches.length > 0) {
            matchInfo.set(shop.documentId, matches);
            return true;
          }
          return false;
        });

        // Sort by match count (most matches first)
        filtered.sort((a, b) => {
          const aMatches = matchInfo.get(a.documentId)?.length || 0;
          const bMatches = matchInfo.get(b.documentId)?.length || 0;
          return bMatches - aMatches;
        });
      }

      return { sidebarShops: filtered, shopMatchInfo: matchInfo, totalFilterCount: filterCount };
    }

    // When "apply my filters" is off, apply the dropdown filter instead
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
  }, [locationFilteredShops, shopFilter, applyMyFilters, userProfile?.preferences, getShopMatches]);

  // Map shows filtered shops when filter is active or "apply my filters" is on
  // Use cachedShops for stable reference (prevents marker recreation on navigation)
  const shopsForMap = useMemo(() => {
    let mapShops = cachedShops;

    // Only apply user preference filters when "apply my filters" toggle is ON
    if (applyMyFilters) {
      const preferences = userProfile?.preferences;
      const preferIndependent = preferences?.preferIndependentOnly;
      const preferredTags = preferences?.preferredTags || [];
      const preferredBrewMethods = preferences?.preferredBrewMethods || [];
      const hasPreferences = preferredTags.length > 0 || preferredBrewMethods.length > 0;

      if (preferIndependent) {
        mapShops = mapShops.filter((shop) => {
          return shop.independent === true || shop.is_chain === false;
        });
      }

      const preferRoastsOwnBeans = preferences?.preferRoastsOwnBeans;
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

    // If location selected and specific dropdown filter active (and "apply my filters" is off), use sidebar filtered shops
    if (selectedLocation && shopFilter !== 'all' && !applyMyFilters) {
      return sidebarShops;
    }

    return mapShops;
  }, [cachedShops, sidebarShops, selectedLocation, shopFilter, applyMyFilters, userProfile?.preferences, shopMatchesTags, shopMatchesBrewMethods]);

  // Track filter changes and show loading overlay, fit map to filtered shops
  useEffect(() => {
    if (prevShopFilterRef.current !== shopFilter) {
      setIsFilterLoading(true);
      // Clear loading after markers have time to update
      const timer = setTimeout(() => {
        setIsFilterLoading(false);
      }, 400); // Slightly longer than marker animation
      prevShopFilterRef.current = shopFilter;

      // When applying a filter (not 'all'), fit map to show all filtered shops
      if (shopFilter !== 'all' && sidebarShops.length > 0) {
        const shopsWithCoords = sidebarShops
          .map(shop => {
            const coords = getShopCoords(shop);
            return coords ? { lng: coords.lng, lat: coords.lat } : null;
          })
          .filter((c): c is { lng: number; lat: number } => c !== null);

        if (shopsWithCoords.length > 0) {
          // Calculate bounds
          const lngs = shopsWithCoords.map(c => c.lng);
          const lats = shopsWithCoords.map(c => c.lat);
          const minLng = Math.min(...lngs);
          const maxLng = Math.max(...lngs);
          const minLat = Math.min(...lats);
          const maxLat = Math.max(...lats);

          // Calculate center and appropriate zoom
          const centerLng = (minLng + maxLng) / 2;
          const centerLat = (minLat + maxLat) / 2;

          // Add padding to bounds
          const lngSpan = Math.max(maxLng - minLng, 0.01) * 1.3;
          const latSpan = Math.max(maxLat - minLat, 0.01) * 1.3;

          // Estimate zoom level based on span (rough approximation)
          const maxSpan = Math.max(lngSpan, latSpan);
          let newZoom = 12;
          if (maxSpan > 0.5) newZoom = 10;
          else if (maxSpan > 0.2) newZoom = 11;
          else if (maxSpan > 0.1) newZoom = 12;
          else if (maxSpan > 0.05) newZoom = 13;
          else newZoom = 14;

          setMapCenter([centerLng, centerLat]);
          setMapZoom(newZoom);
        }
      }

      return () => clearTimeout(timer);
    }
  }, [shopFilter, sidebarShops]);

  // Debug: Log when shops or selectedLocation changes
  useEffect(() => {
    console.log('MainLayout: Map data update', {
      totalShops: shops.length,
      selectedLocation: selectedLocation?.name,
      isLoading,
      mapCenter,
      mapZoom,
    });
  }, [shops, selectedLocation, isLoading, mapCenter, mapZoom]);

  const handleShopSelect = useCallback(
    (shop: Shop) => {
      const isSameLocation = shop.location?.documentId === selectedLocation?.documentId;

      // Track shop history for back navigation (only when navigating from one shop to another)
      if (selectedShop && selectedShop.documentId !== shop.documentId) {
        setShopHistory((prev) => [...prev, selectedShop]);
      }

      setSelectedShop(shop);
      setIsMobileSidebarOpen(false);

      // Update selected location to match the shop's location
      if (shop.location && !isSameLocation) {
        setSelectedLocation(shop.location);
        setIsNearbyMode(false);
        setIsExploreMode(false);
      }

      const countrySlug = slugify(shop.location?.country?.name ?? '');
      const citySlug = slugify(shop.location?.name ?? '');
      // Use "All" as fallback area if shop has no city_area
      const areaSlug = slugify(shop.city_area?.name ?? shop.cityArea?.name ?? 'All');
      const shopSlug = getShopSlug(shop);

      if (countrySlug && citySlug && areaSlug && shopSlug) {
        const newUrl = `/${countrySlug}/${citySlug}/${areaSlug}/${shopSlug}`;
        // Always use shallow routing to avoid server round-trip
        window.history.pushState({}, '', newUrl);
      }
    },
    [router, selectedLocation, selectedShop]
  );

  const handleCloseDrawer = useCallback(() => {
    setSelectedShop(null);
    setShopHistory([]); // Clear history when closing drawer

    // Stay on the city view when closing a shop drawer (shallow URL update)
    if (selectedLocation) {
      const countrySlug = slugify(selectedLocation.country?.name ?? '');
      const citySlug = slugify(selectedLocation.name);
      window.history.pushState(null, '', `/${countrySlug}/${citySlug}`);
    }
  }, [selectedLocation]);

  // Handle going back - either to previous shop or to location drawer
  const handleShopBack = useCallback(() => {
    if (shopHistory.length > 0) {
      // Pop the last shop from history and navigate to it
      const previousShop = shopHistory[shopHistory.length - 1];
      setShopHistory((prev) => prev.slice(0, -1));
      setSelectedShop(previousShop);

      // Update URL
      const countrySlug = slugify(previousShop.location?.country?.name ?? '');
      const citySlug = slugify(previousShop.location?.name ?? '');
      const areaSlug = slugify(previousShop.city_area?.name ?? previousShop.cityArea?.name ?? 'All');
      const shopSlug = getShopSlug(previousShop);

      if (countrySlug && citySlug && areaSlug && shopSlug) {
        const newUrl = `/${countrySlug}/${citySlug}/${areaSlug}/${shopSlug}`;
        window.history.pushState({}, '', newUrl);
      }
    } else if (selectedLocation) {
      // No history - go back to location drawer (city guide)
      setSelectedShop(null);
      setShowMobileCityGuide(true); // Keep drawer open on mobile to show city guide

      // Update URL to location page
      const countrySlug = slugify(selectedLocation.country?.name ?? '');
      const citySlug = slugify(selectedLocation.name);
      if (countrySlug && citySlug) {
        window.history.pushState({}, '', `/${countrySlug}/${citySlug}`);
      }
    } else {
      // No history and no location - just close
      setSelectedShop(null);
    }
  }, [shopHistory, selectedLocation]);

  const handleNearbyToggle = useCallback(async () => {
    // Clear any existing timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }

    setIsLoading(true);
    setSelectedShop(null);
    setIsAreaUnsupported(false);

    // Stay in current view - don't change map or clear location yet
    // The useEffect for coordinates will handle all updates when ready
    setIsExploreMode(true);
    setIsNearbyMode(false);
    // Don't clear location or change map - keep current view during loading

    // Request user location
    requestLocation();

    // Set a timeout fallback
    loadingTimeoutRef.current = setTimeout(() => {
      setIsLoading(false);
      loadingTimeoutRef.current = null;
    }, 5000); // Longer timeout for location permission
  }, [requestLocation]);

  const handleWelcomeFindNearMe = useCallback(() => {
    // Clear any existing timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }

    setIsLoading(true);
    setIsNearbyMode(false);
    setIsExploreMode(true);
    setSelectedLocation(null);
    setMapCenter([0, 20]);
    setMapZoom(2);
    requestLocation();

    // Set a timeout fallback
    loadingTimeoutRef.current = setTimeout(() => {
      setIsLoading(false);
      loadingTimeoutRef.current = null;
    }, 5000);
  }, [requestLocation]);

  const handleWelcomeExplore = useCallback(() => {
    setIsExploreMode(true);
    setIsNearbyMode(false);
    setSelectedLocation(null);
    setSelectedShop(null);
    setMapCenter([0, 20]);
    setMapZoom(2);
  }, []);

  const handleMapTransitionComplete = useCallback(() => {
    // Clear any pending timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    setIsLoading(false);
  }, []);

  const handleUnsupportedCountryClick = useCallback((countryName: string, countryCode: string) => {
    console.log('[MainLayout] handleUnsupportedCountryClick called:', countryName, countryCode);
    setUnsupportedCountry({ name: countryName, code: countryCode });
    setShowUnsupportedCountryModal(true); // Show modal for map clicks
  }, []);

  const handleEmptySupportedCountryClick = useCallback((countryName: string, countryCode: string) => {
    console.log('[MainLayout] handleEmptySupportedCountryClick called:', countryName, countryCode);
    setEmptySupportedCountry({ name: countryName, code: countryCode });
  }, []);

  const handleCityAreaExpand = useCallback((cityAreaId: string | null) => {
    console.log('[MainLayout] handleCityAreaExpand:', cityAreaId);
    setExpandedCityAreaId(cityAreaId);
  }, []);

  // Filter city areas to only those in the selected location
  // Use cachedCityAreas for stable reference
  const cityAreas = useMemo(() => {
    if (!selectedLocation) return [];

    // Filter to city areas that belong to this location
    const filtered = cachedCityAreas.filter(
      (area) => area.location?.documentId === selectedLocation.documentId
    );

    // Debug: log first city area's full object to see what fields exist
    if (filtered.length > 0) {
      console.log('[MainLayout] First city area from prop:', filtered[0]);
      console.log('[MainLayout] City area keys:', Object.keys(filtered[0]));
      console.log('[MainLayout] Has boundary_coordinates:', !!filtered[0].boundary_coordinates);
    }
    return filtered;
  }, [cachedCityAreas, selectedLocation]);

  return (
    <>
      <WelcomeModal
        onFindNearMe={handleWelcomeFindNearMe}
        onExplore={handleWelcomeExplore}
      />

      <ExploreModal
        isOpen={showExploreModal}
        onClose={() => setShowExploreModal(false)}
        locations={cachedLocations}
        countries={cachedCountries}
        allShops={cachedShops}
        events={cachedEvents}
        onLocationSelect={(location) => {
          handleLocationChange(location);
          setShowExploreModal(false);
          // Clear unsupported state when user selects a supported city
          setIsAreaUnsupported(false);
          setUnsupportedCountry(null);
        }}
      />

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />

      <UnsupportedCountryModal
        isOpen={showUnsupportedCountryModal}
        countryName={unsupportedCountry?.name || ''}
        countryCode={unsupportedCountry?.code || ''}
        onClose={() => setShowUnsupportedCountryModal(false)}
        variant="coming-soon"
      />

      <UnsupportedCountryModal
        isOpen={!!emptySupportedCountry}
        countryName={emptySupportedCountry?.name || ''}
        countryCode={emptySupportedCountry?.code || ''}
        onClose={() => setEmptySupportedCountry(null)}
        variant="no-shops"
      />

      <LocationBlockedModal
        isOpen={isPermissionBlocked}
        onClose={clearPermissionBlocked}
      />

      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        locations={cachedLocations}
        shops={cachedShops}
      />

      <FilterPreferencesModal
        isOpen={showFilterPreferencesModal}
        onClose={() => setShowFilterPreferencesModal(false)}
      />

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />

      {/* Mobile menu toggle */}
      <div className="mobile-toggle lg:hidden">
        {isMobileSidebarOpen ? (
          <CircularCloseButton onPress={() => setIsMobileSidebarOpen(false)} size="md" />
        ) : (
          <Button
            isIconOnly
            variant="flat"
            onPress={() => setIsMobileSidebarOpen(true)}
            className="bg-background"
          >
            <Menu className="w-5 h-5" />
          </Button>
        )}
      </div>

      <div className={cn('main-layout', (selectedShop || (selectedLocation && !isNearbyMode)) && 'drawer-open')}>
        <Sidebar
          locations={cachedLocations}
          countries={cachedCountries}
          selectedLocation={selectedLocation}
          onLocationChange={handleLocationChange}
          shops={sidebarShops}
          allShops={locationFilteredShops}
          selectedShop={selectedShop}
          onShopSelect={handleShopSelect}
          isLoading={isLoading}
          isOpen={isMobileSidebarOpen}
          shopFilter={shopFilter}
          onShopFilterChange={setShopFilter}
          isAreaUnsupported={isAreaUnsupported}
          onOpenCityGuide={() => setShowMobileCityGuide(true)}
          unsupportedCountry={unsupportedCountry}
          onOpenExploreModal={() => setShowExploreModal(true)}
          applyMyFilters={applyMyFilters}
          onApplyMyFiltersChange={setApplyMyFilters}
          hasUserFilters={!!(
            userProfile?.preferences?.preferIndependentOnly ||
            userProfile?.preferences?.preferRoastsOwnBeans ||
            (userProfile?.preferences?.preferredTags?.length ?? 0) > 0 ||
            (userProfile?.preferences?.preferredBrewMethods?.length ?? 0) > 0
          )}
          userPreferences={userProfile?.preferences ?? undefined}
          shopMatchInfo={shopMatchInfo}
          onCityAreaExpand={handleCityAreaExpand}
          authComponent={
            <div className="flex items-center gap-3">
              <Button
                isIconOnly
                variant="flat"
                radius="full"
                onPress={handleNearbyToggle}
                size="sm"
                aria-label="Find nearby"
                isDisabled={authLoading}
              >
                <MapPin className="w-4 h-4" />
              </Button>
              <Button
                isIconOnly
                variant="flat"
                radius="full"
                onPress={() => setShowSearchModal(true)}
                size="sm"
                aria-label="Search"
                isDisabled={authLoading}
              >
                <Search className="w-4 h-4" />
              </Button>
              {authLoading ? (
                <div className="w-8 h-8 rounded-full bg-white/20 animate-pulse" />
              ) : user ? (
                <>
                  <Button
                    isIconOnly
                    variant="flat"
                    radius="full"
                    onPress={() => setShowFilterPreferencesModal(true)}
                    size="sm"
                    aria-label="Filter preferences"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                  </Button>
                  <UserMenu onOpenSettings={() => setShowSettingsModal(true)} />
                </>
              ) : (
                <Button
                  isIconOnly
                  variant="flat"
                  radius="full"
                  onPress={() => setShowLoginModal(true)}
                  size="sm"
                  aria-label="Sign in"
                >
                  <LogIn className="w-4 h-4" />
                </Button>
              )}
            </div>
          }
        />

        <MapContainer
          key="map-container"
          shops={shopsForMap}
          selectedShop={selectedShop}
          onShopSelect={handleShopSelect}
          center={mapCenter}
          zoom={mapZoom}
          isLoading={isLoading || isFilterLoading}
          onTransitionComplete={handleMapTransitionComplete}
          countries={cachedCountries}
          locations={cachedLocations}
          onUnsupportedCountryClick={handleUnsupportedCountryClick}
          onEmptySupportedCountryClick={handleEmptySupportedCountryClick}
          userCoordinates={coordinates}
          expandedCityAreaId={expandedCityAreaId}
          cityAreas={cityAreas}
        />

        {(selectedShop || (selectedLocation && !isNearbyMode && (showMobileCityGuide || isDesktop)) || isLocationDrawerClosing) && (
          <UnifiedDrawer
            key="unified-drawer"
            contentType={selectedShop ? 'shop' : 'location'}
            isVisible={!isLocationDrawerClosing}
          >
            {selectedShop ? (
              <ShopDrawer
                key="shop-drawer"
                shop={selectedShop}
                allShops={cachedShops}
                onClose={handleCloseDrawer}
                onShopSelect={handleShopSelect}
                onOpenLoginModal={() => setShowLoginModal(true)}
                onBack={selectedLocation || shopHistory.length > 0 ? handleShopBack : undefined}
                previousShop={shopHistory.length > 0 ? shopHistory[shopHistory.length - 1] : undefined}
                useWrapper={false}
              />
            ) : selectedLocation ? (
              <LocationDrawer
                key="location-drawer"
                location={selectedLocation}
                allShops={cachedShops}
                events={cachedEvents}
                critics={cachedCritics}
                onClose={() => {
                  // Start exit animation
                  setIsLocationDrawerClosing(true);
                  setShowMobileCityGuide(false);
                  // After animation, clear location and reset closing state
                  setTimeout(() => {
                    setSelectedLocation(null);
                    setIsLocationDrawerClosing(false);
                  }, 300);
                }}
                onShopSelect={handleShopSelect}
                useWrapper={false}
                allLocations={cachedLocations}
                onLocationChange={handleLocationChange}
              />
            ) : null}
          </UnifiedDrawer>
        )}
      </div>

      <Footer shops={shops} />
    </>
  );
}
