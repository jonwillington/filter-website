import { useEffect, useRef, useState, RefObject, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { Country } from '@/lib/types';

// Custom Mapbox Studio styles
const BASE_STYLES = {
  light: 'mapbox://styles/jonwillington-deel/cmjzugwf1004x01s919ofgims',
  dark: 'mapbox://styles/jonwillington-deel/cmjzv4sah005q01safrv11qu9',
};

// Overlay colors for unsupported countries (dimmed to make supported pop)
const OVERLAY_COLORS = {
  light: 'rgba(80, 60, 45, 0.6)',    // Strong brown overlay for light mode
  dark: 'rgba(26, 20, 16, 0.75)',    // Strong dark overlay for dark mode
};

// Highlight colors for supported countries (subtle tint to make them pop)
const SUPPORTED_HIGHLIGHT = {
  light: 'rgba(139, 111, 71, 0.15)', // Warm accent tint
  dark: 'rgba(200, 170, 130, 0.12)', // Warm highlight in dark mode
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
 * Returns true if successfully applied, false if style not ready
 * @param skipStyleCheck - set to true when called from style.load callback (where isStyleLoaded() can be unreliable)
 */
function applyCountryOverlay(
  map: mapboxgl.Map,
  theme: 'light' | 'dark',
  supportedCountryCodes: string[],
  skipStyleCheck = false
): boolean {
  // Safety check: ensure style is fully loaded before modifying sources/layers
  // Skip this check when called from style.load callback (Mapbox quirk: isStyleLoaded can return false in callback)
  if (!skipStyleCheck && !map.isStyleLoaded()) {
    return false;
  }

  // Remove existing overlay layers if they exist
  if (map.getLayer('unsupported-country-overlay')) {
    map.removeLayer('unsupported-country-overlay');
  }
  if (map.getLayer('supported-country-highlight')) {
    map.removeLayer('supported-country-highlight');
  }
  if (map.getSource('country-boundaries-overlay')) {
    map.removeSource('country-boundaries-overlay');
  }

  // Add country boundaries source
  map.addSource('country-boundaries-overlay', {
    type: 'vector',
    url: 'mapbox://mapbox.country-boundaries-v1',
  });

  // Add highlight on supported countries (makes them pop)
  if (supportedCountryCodes.length > 0) {
    map.addLayer({
      id: 'supported-country-highlight',
      type: 'fill',
      source: 'country-boundaries-overlay',
      'source-layer': 'country_boundaries',
      filter: ['in', ['get', 'iso_3166_1'], ['literal', supportedCountryCodes]],
      paint: {
        'fill-color': SUPPORTED_HIGHLIGHT[theme],
      },
    });
  }

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

  return true;
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
    console.log('[useMapInstance] Init effect running', {
      hasContainer: !!containerRef.current,
      alreadyInitialized: initializedRef.current,
    });

    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;

    console.log('[useMapInstance] Creating new map...');
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
    currentThemeRef.current = effectiveTheme;

    const newMap = new mapboxgl.Map({
      container: containerRef.current,
      style: BASE_STYLES[effectiveTheme],
      center,
      zoom,
      attributionControl: false,
    });

    // Set globe projection after map creation
    newMap.setProjection('globe');

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
    let styleLoadCalled = false;
    const onStyleLoad = () => {
      if (styleLoadCalled) {
        console.log('[useMapInstance] onStyleLoad already called, skipping');
        return;
      }
      styleLoadCalled = true;
      console.log('[useMapInstance] onStyleLoad called!');

      // Ensure globe projection is set after style loads
      newMap.setProjection('globe');

      // Add atmosphere/fog for globe effect
      newMap.setFog({
        color: currentThemeRef.current === 'dark' ? '#1A1410' : '#FAF5F0',
        'high-color': currentThemeRef.current === 'dark' ? '#2A1F18' : '#E8DDD4',
        'horizon-blend': 0.02,
        'space-color': currentThemeRef.current === 'dark' ? '#0A0806' : '#D8CFC5',
        'star-intensity': currentThemeRef.current === 'dark' ? 0.6 : 0,
      });

      const success = applyCountryOverlay(newMap, currentThemeRef.current, getSupportedCountryCodes(), true);
      console.log('[useMapInstance] Country overlay applied:', success);
      setMapReady(true);
      if (success) {
        setCountryLayerReady(true);
      }
    };

    newMap.on('style.load', onStyleLoad);
    console.log('[useMapInstance] style.load listener attached');

    // Handle race condition: style might already be loaded (from cache)
    // before listener was attached. Check and call manually if so.
    const alreadyLoaded = newMap.isStyleLoaded();
    console.log('[useMapInstance] Style already loaded?', alreadyLoaded);
    if (alreadyLoaded) {
      onStyleLoad();
    }

    // Also listen for the general 'load' event as a fallback
    newMap.on('load', () => {
      console.log('[useMapInstance] Map load event fired');
      if (!styleLoadCalled) {
        console.log('[useMapInstance] Triggering onStyleLoad from load event');
        onStyleLoad();
      }
    });

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

      // Re-apply globe projection after style change
      map.setProjection('globe');

      // Update atmosphere/fog for new theme
      map.setFog({
        color: effectiveTheme === 'dark' ? '#1A1410' : '#FAF5F0',
        'high-color': effectiveTheme === 'dark' ? '#2A1F18' : '#E8DDD4',
        'horizon-blend': 0.02,
        'space-color': effectiveTheme === 'dark' ? '#0A0806' : '#D8CFC5',
        'star-intensity': effectiveTheme === 'dark' ? 0.6 : 0,
      });

      const success = applyCountryOverlay(map, effectiveTheme, getSupportedCountryCodes(), true);
      setMapReady(true);
      if (success) {
        setCountryLayerReady(true);
      }
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
