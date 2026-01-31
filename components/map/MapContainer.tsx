'use client';

import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useRef, useState } from 'react';
import { Spinner } from '@heroui/react';
import { Shop, Country, Location, CityArea } from '@/lib/types';
import { useTheme } from '@/lib/context/ThemeContext';
import { useMapInstance } from '@/lib/hooks/useMapInstance';
import { useMapLayers } from '@/lib/hooks/useMapLayers';
import { useMapPosition } from '@/lib/hooks/useMapPosition';
import { useMapClustering } from '@/lib/hooks/useMapClustering';
import { useUserLocationMarker } from '@/lib/hooks/useUserLocationMarker';
import { useCityAreaBoundaries } from '@/lib/hooks/useCityAreaBoundaries';

interface MapContainerProps {
  shops: Shop[];
  selectedShop: Shop | null;
  onShopSelect: (shop: Shop) => void;
  center?: [number, number];
  zoom?: number;
  isLoading?: boolean;
  onTransitionComplete?: () => void;
  countries?: Country[];
  locations?: Location[];
  onUnsupportedCountryClick?: (countryName: string, countryCode: string) => void;
  onEmptySupportedCountryClick?: (countryName: string, countryCode: string) => void;
  userCoordinates?: { lat: number; lng: number } | null;
  expandedCityAreaId?: string | null;
  cityAreas?: CityArea[];
}

/**
 * MapContainer - Main map component for displaying coffee shops.
 *
 * This component orchestrates several hooks:
 * - useMapInstance: Manages the Mapbox map lifecycle
 * - useMapLayers: Manages country boundaries and world overlay
 * - useMapPosition: Manages map center/zoom transitions
 * - useMapClustering: Manages shop clustering and markers
 *
 * CRITICAL: The map clustering setup has specific timing requirements.
 * The hooks depend on `mapReady` state to prevent race conditions.
 * See CLAUDE.md for detailed documentation on maintaining this file.
 */
export function MapContainer({
  shops,
  selectedShop,
  onShopSelect,
  center = [0, 20],
  zoom = 2,
  isLoading = false,
  onTransitionComplete,
  countries = [],
  locations = [],
  onUnsupportedCountryClick,
  onEmptySupportedCountryClick,
  userCoordinates = null,
  expandedCityAreaId = null,
  cityAreas = [],
}: MapContainerProps) {
  const { effectiveTheme } = useTheme();
  const mapContainer = useRef<HTMLDivElement>(null);
  const shopsRef = useRef<Shop[]>(shops);
  const [displayedShops, setDisplayedShops] = useState<Shop[]>(shops);

  // Keep shopsRef in sync
  useEffect(() => {
    shopsRef.current = shops;
  }, [shops]);

  // Update displayed shops - always keep in sync
  useEffect(() => {
    // Always update displayed shops to stay in sync, even during loading
    // This prevents markers from disappearing when switching locations
    setDisplayedShops(shops);
  }, [shops]);

  // Initialize and manage the map instance
  const {
    map,
    mapReady,
    currentZoom,
    countryLayerReady,
    setCountryLayerReady,
    isChangingStyle,
  } = useMapInstance({
    containerRef: mapContainer,
    center,
    zoom,
    effectiveTheme,
    countries,
  });

  // Setup map overlay layers (country click detection)
  useMapLayers({
    map,
    mapReady,
    countries,
    locations,
    displayedShops,
    effectiveTheme,
    onUnsupportedCountryClick,
    onEmptySupportedCountryClick,
    setCountryLayerReady,
  });

  // Handle map position (center/zoom) transitions
  useMapPosition({
    map,
    mapReady,
    center,
    zoom,
    isLoading,
  });

  // Setup clustering, markers, and interactions
  useMapClustering({
    map,
    mapReady,
    shops: displayedShops,
    selectedShop,
    effectiveTheme,
    currentZoom,
    onShopSelect,
    onTransitionComplete,
    isLoading,
    expandedCityAreaId,
  });

  // Show user's GPS location on the map
  useUserLocationMarker({
    map,
    mapReady,
    coordinates: userCoordinates,
  });

  // Show city area boundaries when expanded in sidebar
  useCityAreaBoundaries({
    map,
    mapReady,
    cityAreas,
    expandedCityAreaId,
    effectiveTheme,
  });

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="map-container" />

      {/* Map initialization indicator - subtle corner spinner instead of blocking overlay */}
      {!countryLayerReady && (
        <div className="absolute top-4 right-16 z-[5] bg-white/80 dark:bg-[rgba(37,28,22,0.8)] backdrop-blur-sm rounded-full p-2 shadow-sm">
          <Spinner size="sm" color="primary" />
        </div>
      )}

      {/* Style transition overlay - fades during globe/street style switch */}
      <div
        className={`absolute inset-0 bg-background pointer-events-none z-[9] ${
          isChangingStyle ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          transition: 'opacity 250ms cubic-bezier(0.25, 0.1, 0.25, 1)',
        }}
        aria-hidden="true"
      />

      {/* Loading spinner overlay */}
      <div
        className={`absolute inset-0 bg-white/60 dark:bg-[rgba(26,20,16,0.6)] backdrop-blur-sm flex items-center justify-center pointer-events-none z-10 ${
          isLoading ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          transition: 'opacity 300ms cubic-bezier(0.25, 0.1, 0.25, 1)',
        }}
      >
        <Spinner size="lg" color="primary" />
      </div>
    </div>
  );
}
