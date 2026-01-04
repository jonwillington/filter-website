import { useEffect, useRef, useState, RefObject, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { Country } from '@/lib/types';

// Custom Mapbox Studio styles
const BASE_STYLES = {
  light: 'mapbox://styles/jonwillington-deel/cmjzugwf1004x01s919ofgims',
  dark: 'mapbox://styles/jonwillington-deel/cmjzv4sah005q01safrv11qu9',
};

// Overlay colors for unsupported countries
const OVERLAY_COLORS = {
  light: 'rgba(80, 60, 45, 0.45)',   // Darker brown overlay for light mode
  dark: 'rgba(26, 20, 16, 0.6)',     // Dark brown overlay
};

export interface UseMapInstanceOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  center: [number, number];
  zoom: number;
  effectiveTheme: 'light' | 'dark';
  countries?: Country[];
}

export interface UseMapInstanceReturn {
  map: mapboxgl.Map | null;
  mapReady: boolean;
  currentZoom: number;
  countryLayerReady: boolean;
  setCountryLayerReady: (ready: boolean) => void;
}

/**
 * Apply country highlighting overlay - dims unsupported countries
 */
function applyCountryOverlay(
  map: mapboxgl.Map,
  theme: 'light' | 'dark',
  supportedCountryCodes: string[]
): void {
  // Remove existing overlay layers if they exist
  if (map.getLayer('unsupported-country-overlay')) {
    map.removeLayer('unsupported-country-overlay');
  }
  if (map.getSource('country-boundaries-overlay')) {
    map.removeSource('country-boundaries-overlay');
  }

  // Add country boundaries source
  map.addSource('country-boundaries-overlay', {
    type: 'vector',
    url: 'mapbox://mapbox.country-boundaries-v1',
  });

  // Add overlay on unsupported countries (excludes supported ones)
  map.addLayer({
    id: 'unsupported-country-overlay',
    type: 'fill',
    source: 'country-boundaries-overlay',
    'source-layer': 'country_boundaries',
    filter: supportedCountryCodes.length > 0
      ? ['!', ['in', ['get', 'iso_3166_1'], ['literal', supportedCountryCodes]]]
      : ['literal', true], // Show on all if no supported countries
    paint: {
      'fill-color': OVERLAY_COLORS[theme],
    },
  });
}

/**
 * Hook to manage Mapbox map instance lifecycle.
 * Handles initialization, theme changes, and cleanup.
 */
export function useMapInstance({
  containerRef,
  center,
  zoom,
  effectiveTheme,
  countries = [],
}: UseMapInstanceOptions): UseMapInstanceReturn {
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const currentThemeRef = useRef(effectiveTheme);
  const [mapReady, setMapReady] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(zoom);
  const [countryLayerReady, setCountryLayerReady] = useState(false);
  const initializedRef = useRef(false);
  const countriesRef = useRef(countries);

  // Keep countries ref up to date
  useEffect(() => {
    countriesRef.current = countries;
  }, [countries]);

  // Get supported country codes
  const getSupportedCountryCodes = useCallback((): string[] => {
    return countriesRef.current
      .filter((c) => c.supported)
      .map((c) => c.code)
      .filter(Boolean);
  }, []);

  // Initialize map (only once)
  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
    currentThemeRef.current = effectiveTheme;

    const newMap = new mapboxgl.Map({
      container: containerRef.current,
      style: BASE_STYLES[effectiveTheme],
      center,
      zoom,
      attributionControl: false,
    });

    newMap.setPadding({ left: 200, right: 0, top: 0, bottom: 0 });

    newMap.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      'top-right'
    );

    newMap.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      'bottom-right'
    );

    // Handle browser zoom changes
    let lastBrowserZoom = window.devicePixelRatio;
    const checkBrowserZoom = () => {
      const currentBrowserZoom = window.devicePixelRatio;
      if (Math.abs(currentBrowserZoom - lastBrowserZoom) > 0.01) {
        lastBrowserZoom = currentBrowserZoom;
        newMap.resize();
      }
    };
    const zoomCheckInterval = setInterval(checkBrowserZoom, 300);

    // Track zoom changes
    newMap.on('zoom', () => {
      setCurrentZoom(newMap.getZoom());
    });

    // When style loads, apply country overlay and mark ready
    const onStyleLoad = () => {
      applyCountryOverlay(newMap, currentThemeRef.current, getSupportedCountryCodes());
      setMapReady(true);
      setCountryLayerReady(true);
    };

    newMap.on('style.load', onStyleLoad);
    setMap(newMap);

    return () => {
      clearInterval(zoomCheckInterval);
      setMapReady(false);
      setCountryLayerReady(false);
      newMap.remove();
      setMap(null);
      initializedRef.current = false;
    };
  }, [zoom, getSupportedCountryCodes]);

  // Handle theme changes
  useEffect(() => {
    if (!map) return;

    console.log('Theme effect running:', {
      effectiveTheme,
      currentRef: currentThemeRef.current,
      willSkip: currentThemeRef.current === effectiveTheme
    });

    if (currentThemeRef.current === effectiveTheme) return;

    const newStyle = BASE_STYLES[effectiveTheme];
    console.log('Changing style to:', newStyle);

    currentThemeRef.current = effectiveTheme;
    setMapReady(false);
    setCountryLayerReady(false);

    // Use 'once' to handle this specific style load
    map.once('style.load', () => {
      console.log('Style loaded! Theme:', effectiveTheme);
      applyCountryOverlay(map, effectiveTheme, getSupportedCountryCodes());
      setMapReady(true);
      setCountryLayerReady(true);
    });

    // Change base style
    map.setStyle(newStyle);
  }, [effectiveTheme, map, getSupportedCountryCodes]);

  // Update country overlay when countries data changes
  useEffect(() => {
    if (!map || !mapReady) return;
    applyCountryOverlay(map, currentThemeRef.current, getSupportedCountryCodes());
  }, [countries, map, mapReady, getSupportedCountryCodes]);

  return {
    map,
    mapReady,
    currentZoom,
    countryLayerReady,
    setCountryLayerReady,
  };
}
