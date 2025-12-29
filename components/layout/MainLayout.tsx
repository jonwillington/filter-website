'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from '../sidebar/Sidebar';
import { MapContainer } from '../map/MapContainer';
import { ShopDrawer } from '../detail/ShopDrawer';
import { Footer } from './Footer';
import { Location, Shop } from '@/lib/types';
import { cn, slugify } from '@/lib/utils';
import { useGeolocation } from '@/lib/hooks/useGeolocation';
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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showTopRecommendations, setShowTopRecommendations] = useState(false);

  const { coordinates, requestLocation } = useGeolocation();

  // Sync state with props
  useEffect(() => {
    setSelectedLocation(initialLocation);
  }, [initialLocation]);

  useEffect(() => {
    setSelectedShop(initialShop);
  }, [initialShop]);

  const handleLocationChange = useCallback(
    (location: Location | null) => {
      setSelectedLocation(location);
      setSelectedShop(null);
      setIsNearbyMode(false);
      setShowTopRecommendations(false);

      if (location) {
        router.push(`/${slugify(location.name)}`);
      } else {
        router.push('/');
      }
    },
    [router]
  );

  // Filter shops based on top recommendations toggle
  const filteredShops = showTopRecommendations
    ? shops.filter((shop) => Boolean(shop.CityAreaRec))
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

  const handleNearbyToggle = useCallback(() => {
    setIsNearbyMode(true);
    setSelectedLocation(null);
    requestLocation();
  }, [requestLocation]);

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

  // Calculate map center
  const getMapCenter = (): [number, number] => {
    if (selectedShop) {
      const coords = getShopCoords(selectedShop);
      if (coords) return [coords.lng, coords.lat];
    }
    if (coordinates && isNearbyMode) {
      return [coordinates.lng, coordinates.lat];
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

  return (
    <>
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

      <div className={cn('main-layout', selectedShop && 'drawer-open')}>
        <Sidebar
          locations={locations}
          selectedLocation={selectedLocation}
          onLocationChange={handleLocationChange}
          shops={filteredShops}
          selectedShop={selectedShop}
          onShopSelect={handleShopSelect}
          isNearbyMode={isNearbyMode}
          onNearbyToggle={handleNearbyToggle}
          isLoading={isLoading}
          isOpen={isMobileSidebarOpen}
          showTopRecommendations={showTopRecommendations}
          onTopRecommendationsChange={setShowTopRecommendations}
        />

        <MapContainer
          shops={filteredShops}
          selectedShop={selectedShop}
          onShopSelect={handleShopSelect}
          center={getMapCenter()}
        />

        {selectedShop && (
          <ShopDrawer
            shop={selectedShop}
            allShops={shops}
            onClose={handleCloseDrawer}
            onShopSelect={handleShopSelect}
          />
        )}
      </div>

      <Footer />
    </>
  );
}
