'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Sidebar, ShopFilterType } from '../sidebar/Sidebar';
import { LeftPanel } from './LeftPanel';

// Dynamic import to prevent mapbox-gl from being bundled server-side (uses eval)
const MapContainer = dynamic(
  () => import('../map/MapContainer').then(mod => ({ default: mod.MapContainer })),
  { ssr: false, loading: () => <div className="flex-1 bg-surface animate-pulse" /> }
);
import { ShopDrawer, LocationDrawer, UnifiedDrawer, ShopDetailInline } from '../detail';
import { Footer } from './Footer';
import { UserMenu } from '../auth/UserMenu';
import { useAuth } from '@/lib/context/AuthContext';
import { useShopData } from '@/lib/context/ShopDataContext';
import { Location, Shop, Country, CityArea, Event, Person, NewsArticle } from '@/lib/types';
import { cn, slugify, getShopSlug, hasCityAreaRecommendation, getShopCoordinates, getMediaUrl } from '@/lib/utils';
import { useGeolocation } from '@/lib/hooks/useGeolocation';
import { useModalState } from '@/lib/hooks/useModalState';
import { filterShopsByLocation } from '@/lib/utils/shopFiltering';
import { getCountryCoordinates } from '@/lib/utils/countryCoordinates';
import { detectUserArea, reverseGeocode } from '@/lib/api/geolocation';
import { Button } from '@heroui/react';
import { Menu, LogIn, Search, MapPin, SlidersHorizontal, ChevronRight, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/lib/context/ThemeContext';
import { CircularCloseButton } from '../ui/CircularCloseButton';
import { ShopList } from '../sidebar/ShopList';
import { AreaList } from '../sidebar/AreaList';
import { FirstTimeWelcome } from '../sidebar/FirstTimeWelcome';
import { useTags } from '@/lib/hooks/useTags';
import { BrandLogo } from '../sidebar/BrandLogoCarousel';

// Stable empty Map to prevent re-render loops
const EMPTY_SHOP_MATCH_INFO = new Map<string, string[]>();

// Zoom level for city area view (slightly zoomed in from city overview)
const CITY_AREA_ZOOM = 13;

// Dynamic imports for modals to reduce initial bundle size
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
const CityGuideModal = dynamic(
  () => import('../modals/CityGuideModal').then(mod => ({ default: mod.CityGuideModal })),
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
  people?: Person[];
  newsArticles?: NewsArticle[];
  visitorCountry?: Country | null;
  /** When true, indicates data is loading client-side (for static shell pages) */
  isClientSideLoading?: boolean;
  /** When true, auto-trigger find-near-me geolocation on mount (from landing page) */
  triggerFindNearMe?: boolean;
  /** Callback to return to the editorial landing page */
  onReturnToLanding?: () => void;
}

export function MainLayout({
  locations,
  initialLocation = null,
  shops,
  initialShop = null,
  countries = [],
  cityAreas: propCityAreas = [],
  events = [],
  people = [],
  newsArticles = [],
  visitorCountry = null,
  isClientSideLoading = false,
  triggerFindNearMe = false,
  onReturnToLanding,
}: MainLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Use cached shop data for stable reference (prevents map marker recreation on navigation)
  const shopData = useShopData();
  const hydrateRef = useRef(shopData.hydrate);
  hydrateRef.current = shopData.hydrate;
  const hasHydratedRef = useRef(false);

  // Hydrate the shop data context with props (only once per mount)
  // Works for both SSR (props arrive populated) and client-side loading (props arrive after fetch)
  useEffect(() => {
    if (!hasHydratedRef.current && shops.length > 0) {
      hydrateRef.current({
        shops,
        locations,
        countries,
        cityAreas: propCityAreas,
        events,
        people,
        newsArticles,
      });
      hasHydratedRef.current = true;
    }
  }, [shops, locations, countries, propCityAreas, events, people, newsArticles]);

  // Use cached data if available, otherwise fall back to props
  const cachedShops = shopData.isHydrated && shopData.shops.length > 0 ? shopData.shops : shops;
  const cachedLocations = shopData.isHydrated && shopData.locations.length > 0 ? shopData.locations : locations;
  const cachedCountries = shopData.isHydrated && shopData.countries.length > 0 ? shopData.countries : countries;
  const cachedCityAreas = shopData.isHydrated && shopData.cityAreas.length > 0 ? shopData.cityAreas : propCityAreas;
  const cachedEvents = shopData.isHydrated && shopData.events.length > 0 ? shopData.events : events;
  const cachedPeople = shopData.isHydrated && shopData.people.length > 0 ? shopData.people : people;
  const cachedNewsArticles = shopData.isHydrated && shopData.newsArticles.length > 0 ? shopData.newsArticles : newsArticles;

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
  const [emptySupportedCountry, setEmptySupportedCountry] = useState<{ name: string; code: string } | null>(null);

  // Consolidated modal state (reduces 7 useState calls to 1)
  const { modals, openModal, closeModal } = useModalState();
  const [isDesktop, setIsDesktop] = useState(false);
  const [isLocationDrawerClosing, setIsLocationDrawerClosing] = useState(false);
  const [expandedCityAreaId, setExpandedCityAreaId] = useState<string | null>(null);
  const [isFirstTimeVisitor, setIsFirstTimeVisitor] = useState(false);

  // City area drill-down navigation (desktop left panel)
  const [selectedCityAreaId, setSelectedCityAreaId] = useState<string | null>(null);
  const [selectedCityAreaName, setSelectedCityAreaName] = useState<string | null>(null);
  // Animation key - increment when entering a city area to trigger stagger animation
  const [shopListAnimationKey, setShopListAnimationKey] = useState(0);

  const { coordinates, requestLocation, isPermissionBlocked, clearPermissionBlocked } = useGeolocation();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { tags } = useTags();
  const { effectiveTheme, setThemeMode } = useTheme();

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

  // Detect first-time visitor
  useEffect(() => {
    const hasBeenShown = localStorage.getItem('filter-welcome-modal-shown');
    if (!hasBeenShown) {
      setIsFirstTimeVisitor(true);
    }
  }, []);

  // Auto-trigger find-near-me when coming from landing page
  useEffect(() => {
    if (triggerFindNearMe) {
      setIsLoading(true);
      setIsNearbyMode(false);
      setIsExploreMode(true);
      setMapCenter([0, 20]);
      setMapZoom(2);
      requestLocation();

      loadingTimeoutRef.current = setTimeout(() => {
        setIsLoading(false);
        loadingTimeoutRef.current = null;
      }, 5000);
    }
  }, []); // Only run once on mount

  // Set initial map position based on visitor's country (only on home page with no location)
  useEffect(() => {
    if (!initialLocation && visitorCountry?.code) {
      const coords = getCountryCoordinates(visitorCountry.code);
      if (coords) {
        setMapCenter(coords.center);
        setMapZoom(coords.zoom);
      }
    }
  }, []); // Only run once on mount

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

  // Update map center when selectedShop changes (for same-location navigation via pushState)
  // Note: No zoom change - just pan to center on the shop
  useEffect(() => {
    if (selectedShop && selectedShop.documentId !== initialShop?.documentId) {
      const coords = getShopCoords(selectedShop);
      if (coords) {
        setMapCenter([coords.lng, coords.lat]);
        // Don't change zoom - keep current zoom level
      }
    }
  }, [selectedShop, initialShop]);

  // Detect if user is in a supported area when coordinates are received
  useEffect(() => {
    // Only run when we have coordinates and we're in explore mode (waiting for nearby detection)
    // isLoading indicates we're actively waiting for location detection
    if (!coordinates || !isExploreMode || !isLoading) return;

    // Point-in-polygon check (ray casting algorithm)
    const isPointInPolygon = (lat: number, lng: number, polygon: Array<{ lat: number; lng: number }>) => {
      let inside = false;
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const yi = polygon[i].lat, xi = polygon[i].lng;
        const yj = polygon[j].lat, xj = polygon[j].lng;
        if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
          inside = !inside;
        }
      }
      return inside;
    };

    // Local fallback: check user coordinates against prefetched city area boundaries
    const findLocalMatch = (): Location | null => {
      for (const area of cachedCityAreas) {
        if (!area.boundary_coordinates || area.boundary_coordinates.length < 3) continue;
        if (isPointInPolygon(coordinates.lat, coordinates.lng, area.boundary_coordinates)) {
          const locId = area.location?.documentId;
          if (locId) {
            const matched = cachedLocations.find((loc) => loc.documentId === locId);
            if (matched) return matched;
          }
        }
      }
      return null;
    };

    const selectLocation = (matchedLocation: Location) => {
      const locationShops = cachedShops.filter(s =>
        s.location?.documentId === matchedLocation.documentId ||
        s.city_area?.location?.documentId === matchedLocation.documentId
      );
      const validShops = locationShops.filter((s) => getShopCoords(s));

      if (validShops.length > 0) {
        const avgLng = validShops.reduce((sum, s) => sum + (getShopCoords(s)?.lng ?? 0), 0) / validShops.length;
        const avgLat = validShops.reduce((sum, s) => sum + (getShopCoords(s)?.lat ?? 0), 0) / validShops.length;
        setMapCenter([avgLng, avgLat]);
        setMapZoom(12);
      }

      setIsAreaUnsupported(false);
      setIsExploreMode(false);
      setIsNearbyMode(false);
      setShopFilter('all');

      setTimeout(() => {
        setSelectedLocation(matchedLocation);
        const countrySlug = slugify(matchedLocation.country?.name ?? '');
        const citySlug = slugify(matchedLocation.name);
        window.history.pushState(null, '', `/${countrySlug}/${citySlug}`);
      }, 300);
    };

    const showUnsupported = async () => {
      setSelectedLocation(null);
      setIsNearbyMode(true);
      setIsExploreMode(false);
      setIsAreaUnsupported(true);
      setIsLoading(false);
      setMapCenter([coordinates.lng, coordinates.lat]);
      setMapZoom(12);

      const countryData = await reverseGeocode(coordinates.lat, coordinates.lng);
      if (countryData) {
        setUnsupportedCountry({ name: countryData.country, code: countryData.countryCode });
      }
    };

    const checkArea = async () => {
      // Try Strapi API first
      const areaData = await detectUserArea(coordinates.lat, coordinates.lng);

      if (areaData?.area) {
        const matchedLocation = cachedLocations.find(
          (loc) => loc.documentId === areaData.area?.location?.documentId
        );
        if (matchedLocation) {
          selectLocation(matchedLocation);
          return;
        }
      }

      // Fallback: check against prefetched city area boundaries locally
      const localMatch = findLocalMatch();
      if (localMatch) {
        selectLocation(localMatch);
        return;
      }

      // No match found
      await showUnsupported();
    };

    checkArea();
  }, [coordinates, isExploreMode, isLoading, cachedLocations, cachedCityAreas, cachedShops, router]);

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
        // Root path - return to landing page
        if (onReturnToLanding) {
          onReturnToLanding();
        }
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

          // If 3 segments, try to match city area: /{country}/{city}/{area}
          if (segments.length >= 3) {
            const areaSlug = segments[2];
            const matchedArea = cachedCityAreas.find(
              (area) =>
                slugify(area.name) === areaSlug &&
                area.location?.documentId === matchedLocation.documentId
            );

            if (matchedArea) {
              setSelectedCityAreaId(matchedArea.documentId);
              setSelectedCityAreaName(matchedArea.name);
              setExpandedCityAreaId(matchedArea.documentId);
            } else {
              // Clear city area if not found
              setSelectedCityAreaId(null);
              setSelectedCityAreaName(null);
              setExpandedCityAreaId(null);
            }
          } else {
            // Only 2 segments - clear city area
            setSelectedCityAreaId(null);
            setSelectedCityAreaName(null);
            setExpandedCityAreaId(null);
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
  }, [cachedLocations, cachedShops, onReturnToLanding]);

  // Sync state with props - only update if the ID actually changed
  // This prevents double-renders when navigating between shops
  useEffect(() => {
    setSelectedLocation((prev) => {
      if (prev?.documentId === initialLocation?.documentId) {
        return prev; // Keep same reference to avoid re-render
      }
      // Clear city area selection and map highlight when location changes
      setSelectedCityAreaId(null);
      setSelectedCityAreaName(null);
      setExpandedCityAreaId(null);
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

      // Start loading transition - spinner fades in (only when navigating TO a location, not back to home)
      if (location) {
        setIsLoading(true);
      }
      setSelectedShop(null);
      setIsNearbyMode(false);
      setIsExploreMode(false);
      setShopFilter('all');
      // Clear city area selection and map highlight
      setSelectedCityAreaId(null);
      setSelectedCityAreaName(null);
      setExpandedCityAreaId(null);
      // Trigger stagger animation for shop/area list
      setShopListAnimationKey(prev => prev + 1);

      // Set location state first to ensure consistency
      setSelectedLocation(location);

      // Calculate map center from location boundary or shop positions
      if (location) {
        let centered = false;

        // Primary: use bounding box center of location boundary polygon
        if (Array.isArray(location.coordinates) && location.coordinates.length > 1) {
          const lats = location.coordinates.map((c: { lat: number; lng: number }) => c.lat);
          const lngs = location.coordinates.map((c: { lat: number; lng: number }) => c.lng);
          const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
          const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
          navigationLocationIdRef.current = location.documentId;
          setMapCenter([centerLng, centerLat]);
          setMapZoom(12);
          centered = true;
        } else if (location.coordinates && !Array.isArray(location.coordinates)) {
          // Fallback: single {lat, lng} coordinate object
          const coords = location.coordinates as { lat: number; lng: number };
          if (coords.lat && coords.lng) {
            navigationLocationIdRef.current = location.documentId;
            setMapCenter([coords.lng, coords.lat]);
            setMapZoom(12);
            centered = true;
          }
        }

        // Last resort: average shop positions
        if (!centered) {
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
          }
        }
      }
      // Note: When location is null (going back to home), we keep the current map position
      // to avoid the jarring globe spin. User can manually zoom out if they want.

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
      // Only set timeout when navigating to a location (not back to home)
      if (location) {
        loadingTimeoutRef.current = setTimeout(() => {
          setIsLoading(false);
          loadingTimeoutRef.current = null;
        }, 2000); // Maximum 2 seconds
      }
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
    let filterCount = 0;

    // Only apply user preference filters when "apply my filters" toggle is ON
    if (applyMyFilters) {
      const matchInfo = new Map<string, string[]>();
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

    // When "apply my filters" is off, use stable empty Map
    if (shopFilter === 'all') return { sidebarShops: filtered, shopMatchInfo: EMPTY_SHOP_MATCH_INFO, totalFilterCount: 0 };

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

    return { sidebarShops: dropdownFiltered, shopMatchInfo: EMPTY_SHOP_MATCH_INFO, totalFilterCount: 0 };
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
      // Only consider it a different location if both have valid documentIds and they differ
      const shopLocationId = shop.location?.documentId;
      const currentLocationId = selectedLocation?.documentId;
      const isSameLocation = !shopLocationId || !currentLocationId || shopLocationId === currentLocationId;

      // Track shop history for back navigation (only when navigating from one shop to another)
      if (selectedShop && selectedShop.documentId !== shop.documentId) {
        setShopHistory((prev) => [...prev, selectedShop]);
      }

      setSelectedShop(shop);
      setIsMobileSidebarOpen(false);

      // Update selected location only if navigating to a genuinely different location
      // Don't change location if shop's location data is incomplete (missing documentId)
      if (shop.location?.documentId && !isSameLocation) {
        setSelectedLocation(shop.location);
        setIsNearbyMode(false);
        setIsExploreMode(false);
      }

      // Note: Map zoom/center and city area highlighting handled by useEffect on selectedShop change

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
    // Note: Keep expandedCityAreaId unchanged - preserve the area highlight

    // Zoom out slightly to show the area
    if (selectedLocation) {
      setMapZoom(CITY_AREA_ZOOM);

      // Stay on the city view when closing a shop drawer (shallow URL update)
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
      // Note: Map zoom/center and city area highlighting handled by useEffect on selectedShop change

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
      // No history - go back to area list view
      setSelectedShop(null);
      openModal('mobileCityGuide'); // Keep drawer open on mobile to show city guide
      // Note: Keep expandedCityAreaId unchanged - preserve the area highlight

      // Zoom out slightly to show the area (not the whole city)
      setMapZoom(CITY_AREA_ZOOM);

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

  const handleFirstTimeFindNearMe = useCallback(() => {
    localStorage.setItem('filter-welcome-modal-shown', 'true');
    setIsFirstTimeVisitor(false);
    handleWelcomeFindNearMe();
  }, [handleWelcomeFindNearMe]);

  const handleFirstTimeExplore = useCallback(() => {
    openModal('explore');
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
    openModal('unsupportedCountry'); // Show modal for map clicks
  }, []);

  const handleEmptySupportedCountryClick = useCallback((countryName: string, countryCode: string) => {
    console.log('[MainLayout] handleEmptySupportedCountryClick called:', countryName, countryCode);
    setEmptySupportedCountry({ name: countryName, code: countryCode });
  }, []);

  const handleCityAreaExpand = useCallback((cityAreaId: string | null) => {
    console.log('[MainLayout] handleCityAreaExpand:', cityAreaId);
    setExpandedCityAreaId(cityAreaId);
  }, []);

  // Handle area selection in drill-down navigation (desktop left panel)
  const handleAreaSelect = useCallback((areaId: string, areaName: string) => {
    setSelectedCityAreaId(areaId);
    setSelectedCityAreaName(areaName);
    // Highlight area on map
    setExpandedCityAreaId(areaId);
    // Trigger stagger animation for shop list
    setShopListAnimationKey(prev => prev + 1);
    // Update URL to include area
    if (selectedLocation) {
      const countrySlug = slugify(selectedLocation.country?.name ?? '');
      const citySlug = slugify(selectedLocation.name);
      const areaSlug = slugify(areaName);
      window.history.pushState(null, '', `/${countrySlug}/${citySlug}/${areaSlug}`);
    }
  }, [selectedLocation]);

  // Handle back from area to area list
  const handleBackToAreaList = useCallback(() => {
    setSelectedCityAreaId(null);
    setSelectedCityAreaName(null);
    // Clear map highlight
    setExpandedCityAreaId(null);

    // Update URL back to just city
    if (selectedLocation) {
      const countrySlug = slugify(selectedLocation.country?.name ?? '');
      const citySlug = slugify(selectedLocation.name);
      window.history.pushState(null, '', `/${countrySlug}/${citySlug}`);
    }
  }, [selectedLocation]);

  // Filter city areas to only those in the selected location
  const cityAreas = useMemo(() => {
    if (!selectedLocation) return [];

    return cachedCityAreas.filter(
      (area) => area.location?.documentId === selectedLocation.documentId
    );
  }, [cachedCityAreas, selectedLocation]);

  // Filter sidebar shops by selected city area (for drill-down navigation)
  const areaFilteredShops = useMemo(() => {
    if (!selectedCityAreaId) return sidebarShops;
    return sidebarShops.filter((shop) => {
      const areaId = shop.city_area?.documentId ?? (shop as any).cityArea?.documentId;
      return areaId === selectedCityAreaId;
    });
  }, [sidebarShops, selectedCityAreaId]);

  // Count unique city areas from shops (for area list condition)
  const uniqueShopAreaCount = useMemo(() => {
    const areaIds = new Set<string>();
    sidebarShops.forEach((shop) => {
      const cityArea = shop.city_area ?? (shop as any).cityArea;
      if (cityArea?.documentId) {
        areaIds.add(cityArea.documentId);
      }
    });
    return areaIds.size;
  }, [sidebarShops]);

  // Compute filter counts for LeftPanel filter dropdown
  const filterCounts = useMemo(() => {
    const shopsToCount = locationFilteredShops;
    const counts: Record<ShopFilterType, number> = {
      all: shopsToCount.length,
      topPicks: 0,
      working: 0,
      interior: 0,
      brewing: 0,
    };

    shopsToCount.forEach((shop) => {
      const anyShop = shop as any;
      if (anyShop.cityAreaRec === true || anyShop.city_area_rec === true || anyShop.cityarearec === true) {
        counts.topPicks++;
      }
      if (anyShop.workingRec === true || anyShop.working_rec === true || anyShop.workingrec === true) {
        counts.working++;
      }
      if (anyShop.interiorRec === true || anyShop.interior_rec === true || anyShop.interiorrec === true) {
        counts.interior++;
      }
      if (anyShop.brewingRec === true || anyShop.brewing_rec === true || anyShop.brewingrec === true) {
        counts.brewing++;
      }
    });

    return counts;
  }, [locationFilteredShops]);

  // Build user filter summary from preferences (for LeftPanel tooltip)
  const userFilterSummary = useMemo(() => {
    const preferences = userProfile?.preferences;
    if (!preferences) return undefined;
    const parts: string[] = [];

    if (preferences.preferIndependentOnly) {
      parts.push('Independent only');
    }

    if (preferences.preferRoastsOwnBeans) {
      parts.push('Roasts own beans');
    }

    // Format brew methods nicely
    preferences.preferredBrewMethods?.forEach((method) => {
      const formatted = method === 'v60' ? 'V60'
        : method === 'aeropress' ? 'AeroPress'
        : method.charAt(0).toUpperCase() + method.slice(1).replace(/_/g, ' ');
      parts.push(formatted);
    });

    // Look up tag labels from tags data
    preferences.preferredTags?.forEach((tagId) => {
      const tag = tags.find(t => t.id === tagId);
      if (tag) {
        parts.push(tag.label);
      }
    });

    return parts.length > 0 ? parts.join(', ') : undefined;
  }, [userProfile?.preferences, tags]);

  // Check if user has any filters set
  const hasUserFilters = !!(
    userProfile?.preferences?.preferIndependentOnly ||
    userProfile?.preferences?.preferRoastsOwnBeans ||
    (userProfile?.preferences?.preferredTags?.length ?? 0) > 0 ||
    (userProfile?.preferences?.preferredBrewMethods?.length ?? 0) > 0
  );

  // Extract unique brand logos for first-time welcome carousel
  const brandLogos = useMemo<BrandLogo[]>(() => {
    const shopsToUse = locationFilteredShops.length > 0 ? locationFilteredShops : cachedShops;
    const seen = new Set<string>();
    const logos: BrandLogo[] = [];

    for (const shop of shopsToUse) {
      if (!shop.brand?.documentId || !shop.brand.logo) continue;
      if (seen.has(shop.brand.documentId)) continue;

      const logoUrl = getMediaUrl(shop.brand.logo);
      if (!logoUrl) continue;

      seen.add(shop.brand.documentId);
      logos.push({
        name: shop.brand.name,
        logoUrl,
      });

      // Cap at 60 logos for performance
      if (logos.length >= 60) break;
    }

    return logos;
  }, [locationFilteredShops, cachedShops]);

  // Auth component shared between mobile sidebar and desktop left panel
  const authComponent = (
    <div className="flex items-center gap-3">
      <Button
        isIconOnly
        variant="flat"
        radius="full"
        onPress={() => setThemeMode(effectiveTheme === 'dark' ? 'light' : 'dark')}
        size="sm"
        aria-label={effectiveTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {effectiveTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </Button>
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
        onPress={() => openModal('search')}
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
            onPress={() => openModal('filterPreferences')}
            size="sm"
            aria-label="Filter preferences"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </Button>
          <UserMenu onOpenSettings={() => openModal('settings')} />
        </>
      ) : (
        <Button
          isIconOnly
          variant="flat"
          radius="full"
          onPress={() => openModal('login')}
          size="sm"
          aria-label="Sign in"
        >
          <LogIn className="w-4 h-4" />
        </Button>
      )}
    </div>
  );

  // Render left panel content based on state
  const renderLeftPanelContent = () => {
    if (isFirstTimeVisitor) {
      return (
        <FirstTimeWelcome
          onFindNearMe={handleFirstTimeFindNearMe}
          onExplore={handleFirstTimeExplore}
          brandLogos={brandLogos}
          visitorCountry={visitorCountry}
        />
      );
    }

    if (isLoading && !selectedLocation && !isAreaUnsupported) {
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-text-secondary">Finding your location...</p>
          </div>
        </div>
      );
    }

    if (isAreaUnsupported) {
      return (
        <div className="flex-1 flex items-center justify-center p-8 text-center">
          <div className="flex flex-col items-center">
            {unsupportedCountry?.code && (
              <img
                src={`https://flagcdn.com/w80/${unsupportedCountry.code.toLowerCase()}.png`}
                alt={`${unsupportedCountry.name} flag`}
                className="w-16 h-12 object-cover rounded mb-4"
              />
            )}
            <p className="text-xl font-semibold text-primary mb-2">
              Coming Soon to {unsupportedCountry?.name || 'your area'}!
            </p>
            <p className="text-sm text-text-secondary">
              Select a city above to explore other locations.
            </p>
          </div>
        </div>
      );
    }

    // Shop detail view (replaces list view on desktop)
    if (selectedShop) {
      return (
        <ShopDetailInline
          shop={selectedShop}
          allShops={cachedShops}
          onShopSelect={handleShopSelect}
          onOpenLoginModal={() => openModal('login')}
        />
      );
    }

    // Location selected - show area list or shop list
    if (selectedLocation) {
      // If shops span multiple city areas, no area selected, and no filter active - show area list first
      if (uniqueShopAreaCount > 1 && !selectedCityAreaId && shopFilter === 'all') {
        return (
          <AreaList
            shops={sidebarShops}
            onAreaSelect={handleAreaSelect}
            animationKey={shopListAnimationKey}
          />
        );
      }

      // Show shop list (filtered by area if area is selected)
      return (
        <div className="p-4">
          <ShopList
            shops={areaFilteredShops}
            selectedShop={selectedShop}
            onShopSelect={handleShopSelect}
            isLoading={isLoading}
            isFiltered={applyMyFilters || shopFilter !== 'all'}
            shopMatchInfo={shopMatchInfo}
            onCityAreaExpand={handleCityAreaExpand}
            variant="large"
            animationKey={shopListAnimationKey}
            isFilteredView={shopFilter !== 'all'}
          />
        </div>
      );
    }

    // No location - return to landing page
    return null;
  };

  return (
    <>
      {/* WelcomeModal replaced by FirstTimeWelcome inline in sidebar */}

      <ExploreModal
        isOpen={modals.explore}
        onClose={() => closeModal('explore')}
        locations={cachedLocations}
        countries={cachedCountries}
        allShops={cachedShops}
        events={cachedEvents}
        onLocationSelect={(location) => {
          // Dismiss first-time visitor state when location selected
          if (isFirstTimeVisitor) {
            localStorage.setItem('filter-welcome-modal-shown', 'true');
            setIsFirstTimeVisitor(false);
          }
          handleLocationChange(location);
          closeModal('explore');
          // Clear unsupported state when user selects a supported city
          setIsAreaUnsupported(false);
          setUnsupportedCountry(null);
        }}
      />

      <LoginModal
        isOpen={modals.login}
        onClose={() => closeModal('login')}
      />

      <UnsupportedCountryModal
        isOpen={modals.unsupportedCountry}
        countryName={unsupportedCountry?.name || ''}
        countryCode={unsupportedCountry?.code || ''}
        onClose={() => closeModal('unsupportedCountry')}
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
        isOpen={modals.search}
        onClose={() => closeModal('search')}
        locations={cachedLocations}
        shops={cachedShops}
      />

      <FilterPreferencesModal
        isOpen={modals.filterPreferences}
        onClose={() => closeModal('filterPreferences')}
      />

      <SettingsModal
        isOpen={modals.settings}
        onClose={() => closeModal('settings')}
      />

      <CityGuideModal
        isOpen={modals.cityGuide}
        onClose={() => closeModal('cityGuide')}
        location={selectedLocation}
        allShops={cachedShops}
        events={cachedEvents}
        people={cachedPeople}
        onShopSelect={handleShopSelect}
        allLocations={cachedLocations}
        onLocationChange={handleLocationChange}
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

      {/* Desktop: Full-width top bar */}
      <div className="top-bar">
        <div className="top-bar-content">
          <div className="flex items-center gap-4">
            <button onClick={onReturnToLanding} className="flex items-center gap-1.5 text-lg font-medium text-primary hover:text-accent transition-colors">
              <img src="/img/cup-logo.svg" alt="" className="nav-logo h-4 w-auto" />
              Filter
            </button>
            <button
              onClick={() => openModal('explore')}
              className="flex items-center gap-0.5 text-sm text-text-secondary hover:text-primary transition-colors"
            >
              Explore cities
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="top-bar-actions">{authComponent}</div>
        </div>
      </div>

      <div className={cn('main-layout', (selectedShop || (selectedLocation && !isNearbyMode)) && 'drawer-open')}>
        {/* Desktop: Left Panel (33% width) - replaces floating sidebar */}
        <LeftPanel
          selectedLocation={selectedLocation}
          unsupportedCountry={unsupportedCountry}
          isAreaUnsupported={isAreaUnsupported}
          onOpenCityGuide={() => openModal('cityGuide')}
          onClearLocation={onReturnToLanding}
          selectedCityAreaName={selectedCityAreaName}
          onBackToAreaList={handleBackToAreaList}
          cityAreaCount={uniqueShopAreaCount}
          shopFilter={shopFilter}
          onShopFilterChange={setShopFilter}
          filterCounts={filterCounts}
          applyMyFilters={applyMyFilters}
          onApplyMyFiltersChange={setApplyMyFilters}
          hasUserFilters={hasUserFilters}
          userFilterSummary={userFilterSummary}
          selectedShop={selectedShop}
          previousShop={shopHistory.length > 0 ? shopHistory[shopHistory.length - 1] : undefined}
          onBack={selectedShop ? handleShopBack : undefined}
          onShopSelect={handleShopSelect}
          events={cachedEvents}
          people={cachedPeople}
          newsArticles={cachedNewsArticles}
          isLoading={isLoading}
          isFirstTimeVisitor={isFirstTimeVisitor}
        >
          {renderLeftPanelContent()}
        </LeftPanel>

        {/* Mobile: Traditional floating sidebar (hidden on desktop via CSS) */}
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
          onOpenCityGuide={() => openModal('mobileCityGuide')}
          unsupportedCountry={unsupportedCountry}
          onOpenExploreModal={() => openModal('explore')}
          applyMyFilters={applyMyFilters}
          onApplyMyFiltersChange={setApplyMyFilters}
          hasUserFilters={hasUserFilters}
          userPreferences={userProfile?.preferences ?? undefined}
          shopMatchInfo={shopMatchInfo}
          onCityAreaExpand={handleCityAreaExpand}
          cityAreaCount={uniqueShopAreaCount}
          isFirstTimeVisitor={isFirstTimeVisitor}
          onFirstTimeFindNearMe={handleFirstTimeFindNearMe}
          onFirstTimeExplore={handleFirstTimeExplore}
          visitorCountry={visitorCountry}
          authComponent={authComponent}
        />

        {/* First-time visitor map overlay */}
        {isFirstTimeVisitor && (
          <div
            className="fixed inset-0 bg-black/40 z-[500] transition-opacity duration-300 pointer-events-none"
            aria-hidden="true"
          />
        )}

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
          activeFilter={shopFilter}
          minZoom={selectedLocation ? 10 : null}
        />

        {/* Mobile-only drawers - shop drawer and location drawer (city guide) */}
        {/* On desktop, shop detail is inline in LeftPanel and city guide is not shown as a drawer */}
        {!isDesktop && (selectedShop || (selectedLocation && !isNearbyMode && modals.mobileCityGuide) || isLocationDrawerClosing) && (
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
                onOpenLoginModal={() => openModal('login')}
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
                people={cachedPeople}
                onClose={() => {
                  // Start exit animation
                  setIsLocationDrawerClosing(true);
                  closeModal('mobileCityGuide');
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

      <Footer
        shops={shops}
        isFirstTimeVisitor={isFirstTimeVisitor}
        onToggleFirstTimeVisitor={() => setIsFirstTimeVisitor(prev => !prev)}
      />
    </>
  );
}
