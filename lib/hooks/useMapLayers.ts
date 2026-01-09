import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { Country, Location, Shop } from '../types';
import {
  setupCountryLayer,
  cleanupCountryLayer,
} from '../utils/mapLayers';

export interface UseMapLayersOptions {
  map: mapboxgl.Map | null;
  mapReady: boolean;
  countries: Country[];
  locations: Location[];
  displayedShops: Shop[];
  effectiveTheme: 'light' | 'dark';
  onUnsupportedCountryClick?: (countryName: string, countryCode: string) => void;
  onEmptySupportedCountryClick?: (countryName: string, countryCode: string) => void;
  setCountryLayerReady: (ready: boolean) => void;
}

/**
 * Hook to manage map overlay layers (country click detection).
 * Country visual highlighting is handled in useMapInstance.
 *
 * IMPORTANT: This hook depends on mapReady to ensure it runs AFTER the map is initialized.
 * Do not remove mapReady from dependencies - it prevents race conditions.
 */
export function useMapLayers({
  map,
  mapReady,
  countries,
  displayedShops,
  onUnsupportedCountryClick,
  onEmptySupportedCountryClick,
  setCountryLayerReady,
}: UseMapLayersOptions): void {
  // Store callbacks in ref to avoid effect re-runs when callbacks change
  const onUnsupportedCountryClickRef = useRef(onUnsupportedCountryClick);
  const onEmptySupportedCountryClickRef = useRef(onEmptySupportedCountryClick);
  useEffect(() => {
    onUnsupportedCountryClickRef.current = onUnsupportedCountryClick;
    onEmptySupportedCountryClickRef.current = onEmptySupportedCountryClick;
  }, [onUnsupportedCountryClick, onEmptySupportedCountryClick]);

  // Setup country boundaries click detection
  // Only re-run when map, mapReady, or countries change (not displayedShops)
  useEffect(() => {
    if (!map || !mapReady) return;

    // If no countries provided, still mark as ready so spinner hides
    if (countries.length === 0) {
      setCountryLayerReady(true);
      return;
    }

    let isSetup = false;
    let cleanupEventHandlers: (() => void) | null = null;

    const trySetup = () => {
      if (isSetup) return;
      isSetup = true;

      try {
        // Use ref for callbacks so they always have latest value
        cleanupEventHandlers = setupCountryLayer(map, {
          countries,
          displayedShops,
          onUnsupportedCountryClick: (name, code) => {
            onUnsupportedCountryClickRef.current?.(name, code);
          },
          onEmptySupportedCountryClick: (name, code) => {
            onEmptySupportedCountryClickRef.current?.(name, code);
          },
        });
        setCountryLayerReady(true);
      } catch (err) {
        console.error('Error setting up country click detection:', err);
        setCountryLayerReady(true); // Still mark ready so spinner hides
      }
    };

    if (map.isStyleLoaded()) {
      trySetup();
    } else {
      map.once('style.load', trySetup);
    }

    return () => {
      cleanupEventHandlers?.();
      cleanupCountryLayer(map);
    };
  }, [countries, displayedShops, mapReady, map, setCountryLayerReady]);
}
