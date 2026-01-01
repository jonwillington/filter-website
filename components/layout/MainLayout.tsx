'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from '../sidebar/Sidebar';
import { MapContainer } from '../map/MapContainer';
import { ShopDrawer } from '../detail/ShopDrawer';
import { LocationDrawer } from '../detail/LocationDrawer';
import { WelcomeModal } from '../modals/WelcomeModal';
import { UnsupportedCountryModal } from '../modals/UnsupportedCountryModal';
import { SearchModal } from '../modals/SearchModal';
import { Footer } from './Footer';
import { LoginModal } from '../auth/LoginModal';
import { UserMenu } from '../auth/UserMenu';
import { useAuth } from '@/lib/context/AuthContext';
import { Location, Shop, Country } from '@/lib/types';
import { cn, slugify, getShopSlug } from '@/lib/utils';
import { useGeolocation } from '@/lib/hooks/useGeolocation';
import { detectUserArea } from '@/lib/api/geolocation';
import { Button } from '@heroui/react';
import { Menu, X, LogIn, Search } from 'lucide-react';

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
  const [showTopRecommendations, setShowTopRecommendations] = useState(false);
  const [isExploreMode, setIsExploreMode] = useState(!initialLocation);
  const [isAreaUnsupported, setIsAreaUnsupported] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([0, 20]);
  const [mapZoom, setMapZoom] = useState<number>(2);
  const [unsupportedCountry, setUnsupportedCountry] = useState<{ name: string; code: string } | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showMobileCityGuide, setShowMobileCityGuide] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  const { coordinates, requestLocation } = useGeolocation();
  const { user, loading: authLoading } = useAuth();

  // Track previous initialShop to detect shop-to-shop transitions
  const prevInitialShopRef = useRef<Shop | null>(null);

  // Helper to get shop coordinates
  const getShopCoords = (shop: Shop): { lng: number; lat: number } | null => {
    if (shop.coordinates?.lng && shop.coordinates?.lat) {
      return shop.coordinates;
    }
    if (shop.longitude && shop.latitude) {
      return { lng: shop.longitude, lat: shop.latitude };
    }
    return null;
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
    } else if (initialLocation && shops.length > 0) {
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
    } else {
      // Explore mode - world view
      setMapCenter([0, 20]);
      setMapZoom(2);
    }

    prevInitialShopRef.current = initialShop;
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
          setShowTopRecommendations(false);

          // Calculate map center for this location
          const locationShops = shops.filter(s =>
            s.location?.documentId === matchedLocation.documentId ||
            s.city_area?.location?.documentId === matchedLocation.documentId
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

          // Update location and route
          setTimeout(() => {
            setSelectedLocation(matchedLocation);
            const countrySlug = slugify(matchedLocation.country?.name ?? '');
            const citySlug = slugify(matchedLocation.name);
            router.push(`/${countrySlug}/${citySlug}`);
          }, 200);
        } else {
          // Area detected but location not in our list
          setIsNearbyMode(true);
          setIsExploreMode(false);
          setIsAreaUnsupported(true);
          // Center on user location
          setMapCenter([coordinates.lng, coordinates.lat]);
          setMapZoom(12);
        }
      } else {
        // No supported area detected - show nearby shops
        setIsNearbyMode(true);
        setIsExploreMode(false);
        setIsAreaUnsupported(true);
        // Center on user location
        setMapCenter([coordinates.lng, coordinates.lat]);
        setMapZoom(12);
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
      setShowTopRecommendations(false);

      // Calculate new map position
      if (location) {
        // Get shops for this location to calculate center
        const locationShops = shops.filter(s =>
          s.location?.documentId === location.documentId ||
          s.city_area?.location?.documentId === location.documentId
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
      } else {
        // No location - explore mode
        setMapCenter([0, 20]);
        setMapZoom(2);
      }

      // Wait for spinner to fully fade in (300ms)
      setTimeout(() => {
        setSelectedLocation(location);

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
    [router, shops]
  );

  // Helper to check if shop has city area recommendation
  const hasCityAreaRecommendation = (shop: Shop): boolean => {
    const anyShop = shop as any;
    if (typeof anyShop.cityAreaRec === 'boolean') {
      return anyShop.cityAreaRec;
    }
    if (typeof anyShop.city_area_rec === 'boolean') {
      return anyShop.city_area_rec;
    }
    if (typeof anyShop.cityarearec === 'boolean') {
      return anyShop.cityarearec;
    }
    return false;
  };

  // Filter shops for sidebar based on selected location
  const locationFilteredShops = useMemo(() => {
    if (!selectedLocation) return shops;
    return shops.filter((shop) =>
      shop.location?.documentId === selectedLocation.documentId ||
      shop.city_area?.location?.documentId === selectedLocation.documentId
    );
  }, [shops, selectedLocation]);

  // Filter shops based on top recommendations toggle (for sidebar)
  const sidebarShops = showTopRecommendations
    ? locationFilteredShops.filter((shop) => hasCityAreaRecommendation(shop))
    : locationFilteredShops;

  // Map always shows all shops
  const shopsForMap = shops;

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
    setSelectedLocation(null);
    router.push('/', { scroll: false });
  }, [router]);

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
    setIsNearbyMode(true);
    setIsExploreMode(false);
    setSelectedLocation(null);
    setMapCenter([0, 20]);
    setMapZoom(2);
    requestLocation();
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
        <Button
          isIconOnly
          variant="flat"
          onPress={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className="bg-white"
        >
          {isMobileSidebarOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </Button>
      </div>

      <div className={cn('main-layout', (selectedShop || (selectedLocation && !isNearbyMode)) && 'drawer-open')}>
        <Sidebar
          locations={locations}
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
          showTopRecommendations={showTopRecommendations}
          onTopRecommendationsChange={setShowTopRecommendations}
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

        {selectedShop ? (
          <ShopDrawer
            shop={selectedShop}
            allShops={shops}
            onClose={handleCloseDrawer}
            onShopSelect={handleShopSelect}
            onOpenLoginModal={() => setShowLoginModal(true)}
          />
        ) : selectedLocation && !isNearbyMode && (showMobileCityGuide || typeof window !== 'undefined' && window.innerWidth >= 1024) ? (
          <LocationDrawer
            location={selectedLocation}
            allShops={shops}
            onClose={() => {
              setShowMobileCityGuide(false);
              handleCloseDrawer();
            }}
            onShopSelect={handleShopSelect}
          />
        ) : null}
      </div>

      <Footer />
    </>
  );
}
