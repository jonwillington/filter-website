'use client';

import { createContext, useContext, useState, useCallback, useRef, ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Location, Shop } from '@/lib/types';
import { slugify, getShopSlug, getShopCoordinates } from '@/lib/utils';

interface LocationContextType {
  // State
  selectedLocation: Location | null;
  selectedShop: Shop | null;
  shopHistory: Shop[];
  isNearbyMode: boolean;
  isExploreMode: boolean;
  isLoading: boolean;

  // Map state
  mapCenter: [number, number];
  mapZoom: number;

  // Actions
  setSelectedLocation: (location: Location | null) => void;
  setSelectedShop: (shop: Shop | null) => void;
  handleLocationChange: (location: Location | null, shops: Shop[]) => void;
  handleShopSelect: (shop: Shop) => void;
  handleCloseDrawer: () => void;
  handleShopBack: () => void;
  setIsNearbyMode: (value: boolean) => void;
  setIsExploreMode: (value: boolean) => void;
  setIsLoading: (value: boolean) => void;
  setMapCenter: (center: [number, number]) => void;
  setMapZoom: (zoom: number) => void;
  onMapTransitionComplete: () => void;
}

const LocationContext = createContext<LocationContextType | null>(null);

interface LocationProviderProps {
  children: ReactNode;
  initialLocation?: Location | null;
  initialShop?: Shop | null;
  shops: Shop[];
}

export function LocationProvider({
  children,
  initialLocation = null,
  initialShop = null,
  shops,
}: LocationProviderProps) {
  const router = useRouter();

  // Core state
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(initialLocation);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(initialShop);
  const [shopHistory, setShopHistory] = useState<Shop[]>([]);
  const [isNearbyMode, setIsNearbyMode] = useState(false);
  const [isExploreMode, setIsExploreMode] = useState(!initialLocation);
  const [isLoading, setIsLoading] = useState(false);

  // Map state
  const [mapCenter, setMapCenter] = useState<[number, number]>([0, 20]);
  const [mapZoom, setMapZoom] = useState<number>(2);

  // Refs for tracking state changes
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevInitialShopRef = useRef<Shop | null>(null);
  const prevInitialLocationRef = useRef<Location | null>(null);
  const navigationLocationIdRef = useRef<string | null>(null);

  // Helper to get shop coordinates
  const getShopCoords = useCallback((shop: Shop): { lng: number; lat: number } | null => {
    const coords = getShopCoordinates(shop);
    return coords ? { lng: coords[0], lat: coords[1] } : null;
  }, []);

  // Sync state with props
  useEffect(() => {
    setSelectedLocation((prev) => {
      if (prev?.documentId === initialLocation?.documentId) {
        return prev;
      }
      return initialLocation;
    });
  }, [initialLocation]);

  useEffect(() => {
    setSelectedShop((prev) => {
      if (prev?.documentId === initialShop?.documentId) {
        return prev;
      }
      return initialShop;
    });
  }, [initialShop]);

  // Initialize map position based on initial state
  useEffect(() => {
    if (initialShop) {
      const coords = getShopCoords(initialShop);
      if (coords) {
        setMapCenter([coords.lng, coords.lat]);
        if (!prevInitialShopRef.current) {
          setMapZoom(14);
        }
      }
      prevInitialShopRef.current = initialShop;
      prevInitialLocationRef.current = initialLocation;
    } else if (initialLocation && shops.length > 0) {
      if (prevInitialLocationRef.current?.documentId !== initialLocation.documentId) {
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
          const avgLng = validShops.reduce((sum, s) => sum + (getShopCoords(s)?.lng ?? 0), 0) / validShops.length;
          const avgLat = validShops.reduce((sum, s) => sum + (getShopCoords(s)?.lat ?? 0), 0) / validShops.length;
          setMapCenter([avgLng, avgLat]);
          setMapZoom(12);
        }
        prevInitialLocationRef.current = initialLocation;
      }
      prevInitialShopRef.current = null;
    } else {
      setMapCenter([0, 20]);
      setMapZoom(2);
      prevInitialShopRef.current = null;
      prevInitialLocationRef.current = null;
    }
  }, [initialShop, initialLocation, shops, getShopCoords]);

  // Update map when selectedShop changes via pushState navigation
  useEffect(() => {
    if (selectedShop && selectedShop.documentId !== initialShop?.documentId) {
      const coords = getShopCoords(selectedShop);
      if (coords) {
        setMapCenter([coords.lng, coords.lat]);
        setMapZoom(14);
      }
    }
  }, [selectedShop, initialShop, getShopCoords]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  const handleLocationChange = useCallback(
    (location: Location | null, allShops: Shop[]) => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }

      setIsLoading(true);
      setSelectedShop(null);
      setIsNearbyMode(false);
      setIsExploreMode(false);
      setSelectedLocation(location);

      // Calculate map center from shop positions (same as initial page load)
      if (location) {
        const locationShops = allShops.filter(s =>
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

      if (location) {
        const countrySlug = slugify(location.country?.name ?? '');
        const citySlug = slugify(location.name);
        router.push(`/${countrySlug}/${citySlug}`);
      } else {
        router.push('/');
      }

      loadingTimeoutRef.current = setTimeout(() => {
        setIsLoading(false);
        loadingTimeoutRef.current = null;
      }, 2000);
    },
    [router, getShopCoords]
  );

  const handleShopSelect = useCallback(
    (shop: Shop) => {
      const isSameLocation = shop.location?.documentId === selectedLocation?.documentId;

      if (selectedShop && selectedShop.documentId !== shop.documentId) {
        setShopHistory((prev) => [...prev, selectedShop]);
      }

      setSelectedShop(shop);

      if (shop.location && !isSameLocation) {
        setSelectedLocation(shop.location);
        setIsNearbyMode(false);
        setIsExploreMode(false);
      }

      const countrySlug = slugify(shop.location?.country?.name ?? '');
      const citySlug = slugify(shop.location?.name ?? '');
      const areaSlug = slugify(shop.city_area?.name ?? shop.cityArea?.name ?? 'All');
      const shopSlug = getShopSlug(shop);

      if (countrySlug && citySlug && areaSlug && shopSlug) {
        const newUrl = `/${countrySlug}/${citySlug}/${areaSlug}/${shopSlug}`;

        if (isSameLocation && selectedShop) {
          window.history.pushState({}, '', newUrl);
        } else {
          router.push(newUrl, { scroll: false });
        }
      }
    },
    [router, selectedLocation, selectedShop]
  );

  const handleCloseDrawer = useCallback(() => {
    setSelectedShop(null);
    setShopHistory([]);

    if (selectedLocation) {
      const countrySlug = slugify(selectedLocation.country?.name ?? '');
      const citySlug = slugify(selectedLocation.name);
      router.push(`/${countrySlug}/${citySlug}`, { scroll: false });
    }
  }, [router, selectedLocation]);

  const handleShopBack = useCallback(() => {
    if (shopHistory.length > 0) {
      const previousShop = shopHistory[shopHistory.length - 1];
      setShopHistory((prev) => prev.slice(0, -1));
      setSelectedShop(previousShop);

      const countrySlug = slugify(previousShop.location?.country?.name ?? '');
      const citySlug = slugify(previousShop.location?.name ?? '');
      const areaSlug = slugify(previousShop.city_area?.name ?? previousShop.cityArea?.name ?? 'All');
      const shopSlug = getShopSlug(previousShop);

      if (countrySlug && citySlug && areaSlug && shopSlug) {
        const newUrl = `/${countrySlug}/${citySlug}/${areaSlug}/${shopSlug}`;
        window.history.pushState({}, '', newUrl);
      }
    } else if (selectedLocation) {
      setSelectedShop(null);
      const countrySlug = slugify(selectedLocation.country?.name ?? '');
      const citySlug = slugify(selectedLocation.name);
      if (countrySlug && citySlug) {
        window.history.pushState({}, '', `/${countrySlug}/${citySlug}`);
      }
    } else {
      setSelectedShop(null);
    }
  }, [shopHistory, selectedLocation]);

  const onMapTransitionComplete = useCallback(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    setIsLoading(false);
  }, []);

  const value: LocationContextType = {
    selectedLocation,
    selectedShop,
    shopHistory,
    isNearbyMode,
    isExploreMode,
    isLoading,
    mapCenter,
    mapZoom,
    setSelectedLocation,
    setSelectedShop,
    handleLocationChange,
    handleShopSelect,
    handleCloseDrawer,
    handleShopBack,
    setIsNearbyMode,
    setIsExploreMode,
    setIsLoading,
    setMapCenter,
    setMapZoom,
    onMapTransitionComplete,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocationContext() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocationContext must be used within a LocationProvider');
  }
  return context;
}
