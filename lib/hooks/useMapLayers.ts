import { useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import { Country, Location, Shop } from '../types';
import {
  setupCountryLayer,
  cleanupCountryLayer,
  setupWorldOverlay,
  cleanupWorldOverlay,
} from '../utils/mapLayers';

export interface UseMapLayersOptions {
  map: mapboxgl.Map | null;
  mapReady: boolean;
  countries: Country[];
  locations: Location[];
  displayedShops: Shop[];
  effectiveTheme: 'light' | 'dark';
  onUnsupportedCountryClick?: (countryName: string, countryCode: string) => void;
  setCountryLayerReady: (ready: boolean) => void;
}

/**
 * Hook to manage map overlay layers (country boundaries and world overlay).
 *
 * IMPORTANT: This hook depends on mapReady to ensure it runs AFTER the map is initialized.
 * Do not remove mapReady from dependencies - it prevents race conditions.
 */
export function useMapLayers({
  map,
  mapReady,
  countries,
  locations,
  displayedShops,
  effectiveTheme,
  onUnsupportedCountryClick,
  setCountryLayerReady,
}: UseMapLayersOptions): void {
  // Setup country boundaries highlighting
  useEffect(() => {
    if (!map || !mapReady) return;

    // If no countries provided, still mark as ready so spinner hides
    if (countries.length === 0) {
      setCountryLayerReady(true);
      return;
    }

    let isSetup = false;

    const trySetup = () => {
      if (isSetup) return;
      isSetup = true;

      try {
        setupCountryLayer(map, {
          countries,
          displayedShops,
          onUnsupportedCountryClick,
        });
        setCountryLayerReady(true);
      } catch (err) {
        console.error('Error setting up country highlighting:', err);
        setCountryLayerReady(true); // Still mark ready so spinner hides
      }
    };

    if (map.isStyleLoaded()) {
      trySetup();
    } else {
      map.once('style.load', trySetup);
    }

    return () => {
      cleanupCountryLayer(map);
    };
  }, [countries, onUnsupportedCountryClick, displayedShops, mapReady, effectiveTheme, map, setCountryLayerReady]);

  // Setup world overlay with city boundary holes
  useEffect(() => {
    if (!map || !mapReady) return;

    const trySetup = () => {
      try {
        setupWorldOverlay(map, {
          locations,
          effectiveTheme,
        });
      } catch (err) {
        console.error('Error setting up world overlay:', err);
      }
    };

    if (map.isStyleLoaded()) {
      trySetup();
    } else {
      map.once('style.load', trySetup);
    }

    return () => {
      cleanupWorldOverlay(map);
    };
  }, [locations, mapReady, effectiveTheme, map]);
}
