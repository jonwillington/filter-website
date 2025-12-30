'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from '../sidebar/Sidebar';
import { MapContainer } from '../map/MapContainer';
import { ShopDrawer } from '../detail/ShopDrawer';
import { LocationDrawer } from '../detail/LocationDrawer';
import { WelcomeModal } from '../modals/WelcomeModal';
import { Footer } from './Footer';
import { Location, Shop } from '@/lib/types';
import { cn, slugify } from '@/lib/utils';
import { useGeolocation } from '@/lib/hooks/useGeolocation';
import { detectUserArea } from '@/lib/api/geolocation';
import { Button } from '@heroui/react';
import { Menu, X } from 'lucide-react';

interface MainLayoutProps {
  locations: Location[];
  initialLocation?: Location | null;
  shops: Shop[];
  initialShop?: Shop | null;
}

export function MainLayout({
  locations,
  initialLocation = null,
  shops,
  initialShop = null,
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

  const { coordinates, requestLocation } = useGeolocation();

  // Detect if user is in a supported area when coordinates are received
  useEffect(() => {
    if (!coordinates || !isNearbyMode) return;

    const checkArea = async () => {
      const areaData = await detectUserArea(coordinates.lat, coordinates.lng);

      if (areaData?.area) {
        // User is in a supported area - find and select the corresponding location
        const matchedLocation = locations.find(
          (loc) => loc.documentId === areaData.area?.location?.documentId
        );

        if (matchedLocation) {
          setIsAreaUnsupported(false);
          setIsNearbyMode(false);
          setSelectedLocation(matchedLocation);
          router.push(`/${slugify(matchedLocation.name)}`);
        } else {
          // Area detected but location not in our list
          setIsAreaUnsupported(true);
        }
      } else {
        // No supported area detected
        setIsAreaUnsupported(true);
      }
    };

    checkArea();
  }, [coordinates, isNearbyMode, locations, router]);

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

      // Wait for spinner to fully fade in (300ms)
      setTimeout(() => {
        setSelectedLocation(location);

        if (location) {
          router.push(`/${slugify(location.name)}`);
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

  // Filter shops based on top recommendations toggle
  const filteredShops = showTopRecommendations
    ? shops.filter((shop) => hasCityAreaRecommendation(shop))
    : shops;

  const handleShopSelect = useCallback(
    (shop: Shop) => {
      setSelectedShop(shop);
      setIsMobileSidebarOpen(false);

      const citySlug = slugify(shop.location?.name ?? '');
      const areaSlug = slugify(shop.city_area?.name ?? shop.cityArea?.name ?? '');
      const shopSlug = shop.slug ?? slugify(shop.name);

      if (citySlug && areaSlug && shopSlug) {
        router.push(`/${citySlug}/${areaSlug}/${shopSlug}`, { scroll: false });
      }
    },
    [router]
  );

  const handleCloseDrawer = useCallback(() => {
    setSelectedShop(null);

    if (selectedLocation) {
      router.push(`/${slugify(selectedLocation.name)}`, { scroll: false });
    } else {
      router.push('/', { scroll: false });
    }
  }, [router, selectedLocation]);

  const handleNearbyToggle = useCallback(async () => {
    // Clear any existing timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }

    setIsLoading(true);
    setIsNearbyMode(true);
    setIsExploreMode(false);
    setSelectedShop(null);

    // Request user location
    requestLocation();

    // Set a timeout fallback
    loadingTimeoutRef.current = setTimeout(() => {
      setIsLoading(false);
      loadingTimeoutRef.current = null;
    }, 2500);
  }, [requestLocation]);

  const handleWelcomeFindNearMe = useCallback(() => {
    setIsNearbyMode(true);
    setIsExploreMode(false);
    setSelectedLocation(null);
    requestLocation();
  }, [requestLocation]);

  const handleWelcomeExplore = useCallback(() => {
    setIsExploreMode(true);
    setIsNearbyMode(false);
    setSelectedLocation(null);
    setSelectedShop(null);
  }, []);

  const handleMapTransitionComplete = useCallback(() => {
    // Clear any pending timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    setIsLoading(false);
  }, []);

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

  // Calculate map center and zoom
  const getMapCenter = (): [number, number] => {
    if (selectedShop) {
      const coords = getShopCoords(selectedShop);
      if (coords) return [coords.lng, coords.lat];
    }
    if (coordinates && isNearbyMode) {
      return [coordinates.lng, coordinates.lat];
    }
    if (isExploreMode) {
      return [0, 20]; // World view center
    }
    if (shops.length > 0) {
      const validShops = shops.filter((s) => getShopCoords(s));
      if (validShops.length > 0) {
        const avgLng =
          validShops.reduce((sum, s) => sum + (getShopCoords(s)?.lng ?? 0), 0) /
          validShops.length;
        const avgLat =
          validShops.reduce((sum, s) => sum + (getShopCoords(s)?.lat ?? 0), 0) /
          validShops.length;
        return [avgLng, avgLat];
      }
    }
    return [28.9784, 41.0082]; // Istanbul default
  };

  const getMapZoom = (): number => {
    if (isExploreMode) {
      return 2; // Zoomed out world view
    }
    return 12; // Default city zoom
  };

  return (
    <>
      <WelcomeModal
        onFindNearMe={handleWelcomeFindNearMe}
        onExplore={handleWelcomeExplore}
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
          shops={filteredShops}
          allShops={shops}
          selectedShop={selectedShop}
          onShopSelect={handleShopSelect}
          isNearbyMode={isNearbyMode}
          onNearbyToggle={handleNearbyToggle}
          isLoading={isLoading}
          isOpen={isMobileSidebarOpen}
          showTopRecommendations={showTopRecommendations}
          onTopRecommendationsChange={setShowTopRecommendations}
          isAreaUnsupported={isAreaUnsupported}
        />

        <MapContainer
          shops={isExploreMode ? shops : filteredShops}
          selectedShop={selectedShop}
          onShopSelect={handleShopSelect}
          center={getMapCenter()}
          zoom={getMapZoom()}
          isLoading={isLoading}
          onTransitionComplete={handleMapTransitionComplete}
        />

        {selectedShop ? (
          <ShopDrawer
            shop={selectedShop}
            allShops={shops}
            onClose={handleCloseDrawer}
            onShopSelect={handleShopSelect}
          />
        ) : selectedLocation && !isNearbyMode ? (
          <LocationDrawer
            location={selectedLocation}
            allShops={shops}
            onClose={handleCloseDrawer}
            onShopSelect={handleShopSelect}
          />
        ) : null}
      </div>

      <Footer />
    </>
  );
}
