'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar, ShopFilterType } from '../sidebar/Sidebar';
import { MapContainer } from '../map/MapContainer';
import { ShopDrawer } from '../detail/ShopDrawer';
import { LocationDrawer } from '../detail/LocationDrawer';
import { UnifiedDrawer } from '../detail/UnifiedDrawer';
import { WelcomeModal } from '../modals/WelcomeModal';
import { UnsupportedCountryModal } from '../modals/UnsupportedCountryModal';
import { SearchModal } from '../modals/SearchModal';
import { Footer } from './Footer';
import { LoginModal } from '../auth/LoginModal';
import { UserMenu } from '../auth/UserMenu';
import { useAuth } from '@/lib/context/AuthContext';
import { Location, Shop, Country } from '@/lib/types';
import { cn, slugify, getShopSlug, hasCityAreaRecommendation, getShopCoordinates } from '@/lib/utils';
import { useGeolocation } from '@/lib/hooks/useGeolocation';
import { filterShopsByLocation } from '@/lib/utils/shopFiltering';
import { detectUserArea, reverseGeocode } from '@/lib/api/geolocation';
import { Button } from '@heroui/react';
import { Menu, LogIn, Search } from 'lucide-react';
import { CircularCloseButton } from '../ui/CircularCloseButton';

interface MainLayoutProps {
  locations: Location[];
  initialLocation?: Location | null;
  shops: Shop[];
  initialShop?: Shop | null;
  countries?: Country[];
}

export function MainLayout({
  locations,
  initialLocation = null,
  shops,
  initialShop = null,
  countries = [],
}: MainLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [selectedLocation, setSelectedLocation] = useState<Location | null>(initialLocation);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(initialShop);
  const [isNearbyMode, setIsNearbyMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [shopFilter, setShopFilter] = useState<ShopFilterType>('all');
  const [isExploreMode, setIsExploreMode] = useState(!initialLocation);
  const [isAreaUnsupported, setIsAreaUnsupported] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([0, 20]);
  const [mapZoom, setMapZoom] = useState<number>(2);
  const [unsupportedCountry, setUnsupportedCountry] = useState<{ name: string; code: string } | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showMobileCityGuide, setShowMobileCityGuide] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  const { coordinates, requestLocation } = useGeolocation();
  const { user, loading: authLoading } = useAuth();

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
        // Only set zoom to 14 if we weren't viewing a shop before
        // This preserves the zoom level when clicking between nearby shops
        if (!prevInitialShopRef.current) {
          setMapZoom(14);
        }
      }
      prevInitialShopRef.current = initialShop;
      prevInitialLocationRef.current = initialLocation;
    } else if (initialLocation && shops.length > 0) {
      // Only update map if location actually changed
      if (prevInitialLocationRef.current?.documentId !== initialLocation.documentId) {
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

  // Detect if user is in a supported area when coordinates are received
  useEffect(() => {
    // Only run when we have coordinates and we're in explore mode (waiting for nearby detection)
    // and we don't already have a selected location
    if (!coordinates || !isExploreMode || selectedLocation) return;

    const checkArea = async () => {
      const areaData = await detectUserArea(coordinates.lat, coordinates.lng);

      if (areaData?.area) {
        // User is in a supported area - find and select the corresponding location
        const matchedLocation = locations.find(
          (loc) => loc.documentId === areaData.area?.location?.documentId
        );

        if (matchedLocation) {
          // Smoothly transition to the supported city
          setIsAreaUnsupported(false);
          setIsExploreMode(false);
          setIsNearbyMode(false); // Exit nearby mode
          setShopFilter('all');

          // Set location first, then navigate after a brief delay to let state settle
          setSelectedLocation(matchedLocation);

          // Navigate to the location page
          setTimeout(() => {
            const countrySlug = slugify(matchedLocation.country?.name ?? '');
            const citySlug = slugify(matchedLocation.name);
            router.push(`/${countrySlug}/${citySlug}`);
          }, 100);
        } else {
          // Area detected but location not in our list
          setIsNearbyMode(true);
          setIsExploreMode(false);
          setIsAreaUnsupported(true);
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
        setIsNearbyMode(true);
        setIsExploreMode(false);
        setIsAreaUnsupported(true);
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
  }, [coordinates, isExploreMode, selectedLocation, locations, router, shops]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  // Sync state with props
  useEffect(() => {
    setSelectedLocation(initialLocation);
  }, [initialLocation]);

  useEffect(() => {
    setSelectedShop(initialShop);
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

      // Navigate to the location page
      setTimeout(() => {
        if (location) {
          const countrySlug = slugify(location.country?.name ?? '');
          const citySlug = slugify(location.name);
          router.push(`/${countrySlug}/${citySlug}`);
        } else {
          router.push('/');
        }

        // Set a timeout fallback to ensure loading doesn't take too long
        // Map's onTransitionComplete will clear this if it finishes first
        loadingTimeoutRef.current = setTimeout(() => {
          setIsLoading(false);
          loadingTimeoutRef.current = null;
        }, 2500); // Maximum 2.5 seconds after location data changes
      }, 300);
    },
    [router]
  );

  // Note: hasCityAreaRecommendation is imported from @/lib/utils

  // Filter shops for sidebar based on selected location (uses imported utility)
  const locationFilteredShops = useMemo(
    () => filterShopsByLocation(shops, selectedLocation),
    [shops, selectedLocation]
  );

  // Filter shops based on selected filter (for sidebar)
  const sidebarShops = useMemo(() => {
    if (shopFilter === 'all') return locationFilteredShops;

    return locationFilteredShops.filter((shop) => {
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
  }, [locationFilteredShops, shopFilter]);

  // Map always shows all shops
  const shopsForMap = shops;

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
      setSelectedShop(shop);
      setIsMobileSidebarOpen(false);

      // Update selected location to match the shop's location
      if (shop.location && shop.location.documentId !== selectedLocation?.documentId) {
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
        router.push(`/${countrySlug}/${citySlug}/${areaSlug}/${shopSlug}`, { scroll: false });
      }
    },
    [router, selectedLocation]
  );

  const handleCloseDrawer = useCallback(() => {
    setSelectedShop(null);

    // Stay on the city view when closing a shop drawer
    if (selectedLocation) {
      const countrySlug = slugify(selectedLocation.country?.name ?? '');
      const citySlug = slugify(selectedLocation.name);
      router.push(`/${countrySlug}/${citySlug}`, { scroll: false });
    }
  }, [router, selectedLocation]);

  const handleNearbyToggle = useCallback(async () => {
    // Clear any existing timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }

    setIsLoading(true);
    setSelectedShop(null);
    setIsAreaUnsupported(false);

    // Stay in explore mode (zoomed out) until we get coordinates
    setIsExploreMode(true);
    setIsNearbyMode(false);
    setSelectedLocation(null);

    // Set map to world view
    setMapCenter([0, 20]);
    setMapZoom(2);

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
    setUnsupportedCountry({ name: countryName, code: countryCode });
  }, []);

  return (
    <>
      <WelcomeModal
        onFindNearMe={handleWelcomeFindNearMe}
        onExplore={handleWelcomeExplore}
      />

      <UnsupportedCountryModal
        isOpen={!!unsupportedCountry}
        countryName={unsupportedCountry?.name || ''}
        countryCode={unsupportedCountry?.code}
        onClose={() => setUnsupportedCountry(null)}
      />

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />

      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        locations={locations}
        shops={shops}
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
            className="bg-white"
          >
            <Menu className="w-5 h-5" />
          </Button>
        )}
      </div>

      <div className={cn('main-layout', (selectedShop || (selectedLocation && !isNearbyMode)) && 'drawer-open')}>
        <Sidebar
          locations={locations}
          countries={countries}
          selectedLocation={selectedLocation}
          onLocationChange={handleLocationChange}
          shops={sidebarShops}
          allShops={locationFilteredShops}
          selectedShop={selectedShop}
          onShopSelect={handleShopSelect}
          isNearbyMode={isNearbyMode}
          onNearbyToggle={handleNearbyToggle}
          isLoading={isLoading}
          isOpen={isMobileSidebarOpen}
          shopFilter={shopFilter}
          onShopFilterChange={setShopFilter}
          isAreaUnsupported={isAreaUnsupported}
          onOpenCityGuide={() => setShowMobileCityGuide(true)}
          authComponent={
            !authLoading && (
              <div className="flex items-center gap-2">
                <Button
                  isIconOnly
                  variant="flat"
                  onPress={() => setShowSearchModal(true)}
                  size="sm"
                  aria-label="Search"
                >
                  <Search className="w-4 h-4" />
                </Button>
                {user ? (
                  <UserMenu />
                ) : (
                  <Button
                    variant="flat"
                    onPress={() => setShowLoginModal(true)}
                    startContent={<LogIn className="w-4 h-4" />}
                    size="sm"
                  >
                    Sign In
                  </Button>
                )}
              </div>
            )
          }
        />

        <MapContainer
          key={`map-${selectedLocation?.documentId || 'explore'}`}
          shops={shopsForMap}
          selectedShop={selectedShop}
          onShopSelect={handleShopSelect}
          center={mapCenter}
          zoom={mapZoom}
          isLoading={isLoading}
          onTransitionComplete={handleMapTransitionComplete}
          countries={countries}
          onUnsupportedCountryClick={handleUnsupportedCountryClick}
        />

        {(selectedShop || (selectedLocation && !isNearbyMode && (showMobileCityGuide || isDesktop))) && (
          <UnifiedDrawer key="unified-drawer" contentType={selectedShop ? 'shop' : 'location'}>
            {selectedShop ? (
              <ShopDrawer
                key="shop-drawer"
                shop={selectedShop}
                allShops={shops}
                onClose={handleCloseDrawer}
                onShopSelect={handleShopSelect}
                onOpenLoginModal={() => setShowLoginModal(true)}
                useWrapper={false}
              />
            ) : selectedLocation ? (
              <LocationDrawer
                key="location-drawer"
                location={selectedLocation}
                allShops={shops}
                onClose={() => {
                  // Just close the city guide sheet - don't navigate away or zoom out
                  setShowMobileCityGuide(false);
                }}
                onShopSelect={handleShopSelect}
                useWrapper={false}
              />
            ) : null}
          </UnifiedDrawer>
        )}
      </div>

      <Footer />
    </>
  );
}
