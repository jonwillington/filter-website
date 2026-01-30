import { useEffect, useRef, useState, RefObject, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { Country } from '@/lib/types';

// Custom Mapbox Studio styles for globe/world view (warm, branded)
const GLOBE_STYLES = {
  light: 'mapbox://styles/jonwillington-deel/cmjzugwf1004x01s919ofgims',
  dark: 'mapbox://styles/jonwillington-deel/cmjzv4sah005q01safrv11qu9',
};

// Standard Mapbox styles for street-level view (functional, detailed)
const STREET_STYLES = {
  light: 'mapbox://styles/mapbox/streets-v12',
  dark: 'mapbox://styles/mapbox/dark-v11',
};

// Zoom threshold for switching between globe and street styles
const STYLE_SWITCH_ZOOM = 10;

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
  isChangingStyle: boolean;
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
  const [isChangingStyle, setIsChangingStyle] = useState(false);
  const initializedRef = useRef(false);
  const countriesRef = useRef(countries);
  // Track current style mode: 'globe' for world view, 'street' for detailed local view
  const currentStyleModeRef = useRef<'globe' | 'street'>(zoom >= STYLE_SWITCH_ZOOM ? 'street' : 'globe');
  const isChangingStyleRef = useRef(false);

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

    // Choose initial style based on zoom level
    const initialStyleMode = zoom >= STYLE_SWITCH_ZOOM ? 'street' : 'globe';
    currentStyleModeRef.current = initialStyleMode;
    const initialStyle = initialStyleMode === 'street'
      ? STREET_STYLES[effectiveTheme]
      : GLOBE_STYLES[effectiveTheme];

    console.log('[useMapInstance] Initial style mode:', initialStyleMode, 'zoom:', zoom);

    const newMap = new mapboxgl.Map({
      container: containerRef.current,
      style: initialStyle,
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

    // Track zoom changes and switch styles when crossing threshold
    newMap.on('zoom', () => {
      const newZoom = newMap.getZoom();
      setCurrentZoom(newZoom);

      // Check if we need to switch style modes
      const shouldBeStreet = newZoom >= STYLE_SWITCH_ZOOM;
      const currentMode = currentStyleModeRef.current;
      const needsSwitch = (shouldBeStreet && currentMode === 'globe') ||
                          (!shouldBeStreet && currentMode === 'street');

      if (needsSwitch && !isChangingStyleRef.current) {
        const newMode = shouldBeStreet ? 'street' : 'globe';
        console.log('[useMapInstance] Switching style mode:', currentMode, '->', newMode, 'at zoom:', newZoom);

        isChangingStyleRef.current = true;
        setIsChangingStyle(true);
        currentStyleModeRef.current = newMode;

        // IMPORTANT: Set mapReady to false so clustering effect re-runs after style loads
        // Without this, markers won't be recreated after setStyle() removes them
        setMapReady(false);
        setCountryLayerReady(false);

        const newStyle = newMode === 'street'
          ? STREET_STYLES[currentThemeRef.current]
          : GLOBE_STYLES[currentThemeRef.current];

        // Style change will trigger style.load event
        newMap.setStyle(newStyle);
      }
    });

    // When style loads, apply appropriate settings based on style mode
    let styleLoadCalled = false;
    const onStyleLoad = () => {
      if (styleLoadCalled && !isChangingStyleRef.current) {
        console.log('[useMapInstance] onStyleLoad already called, skipping');
        return;
      }
      styleLoadCalled = true;

      const styleMode = currentStyleModeRef.current;
      console.log('[useMapInstance] onStyleLoad called! Mode:', styleMode);

      isChangingStyleRef.current = false;
      setIsChangingStyle(false);

      if (styleMode === 'globe') {
        // Globe mode: apply projection and fog for 3D globe effect
        newMap.setProjection('globe');
        newMap.setFog({
          color: currentThemeRef.current === 'dark' ? '#1A1410' : '#FAF5F0',
          'high-color': currentThemeRef.current === 'dark' ? '#2A1F18' : '#E8DDD4',
          'horizon-blend': 0.02,
          'space-color': currentThemeRef.current === 'dark' ? '#0A0806' : '#D8CFC5',
          'star-intensity': currentThemeRef.current === 'dark' ? 0.6 : 0,
        });

        // Apply country overlay only in globe mode
        const success = applyCountryOverlay(newMap, currentThemeRef.current, getSupportedCountryCodes(), true);
        console.log('[useMapInstance] Country overlay applied:', success);
      } else {
        // Street mode: use mercator projection (flat map)
        newMap.setProjection('mercator');
        // Clear fog for street view
        newMap.setFog(null as any);
      }

      setMapReady(true);
      setCountryLayerReady(true);
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

    // Choose style based on current mode and new theme
    const styleMode = currentStyleModeRef.current;
    const newStyle = styleMode === 'street'
      ? STREET_STYLES[effectiveTheme]
      : GLOBE_STYLES[effectiveTheme];
    console.log('Changing style to:', newStyle, 'mode:', styleMode);

    currentThemeRef.current = effectiveTheme;
    setMapReady(false);
    setCountryLayerReady(false);
    setIsChangingStyle(true);

    // Use 'once' to handle this specific style load
    map.once('style.load', () => {
      console.log('Style loaded! Theme:', effectiveTheme, 'Mode:', styleMode);

      if (styleMode === 'globe') {
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
        if (!success) {
          console.warn('[useMapInstance] Failed to apply country overlay');
        }
      } else {
        map.setProjection('mercator');
        map.setFog(null as any);
      }

      setMapReady(true);
      setCountryLayerReady(true);
      setIsChangingStyle(false);
    });

    // Change base style
    map.setStyle(newStyle);
  }, [effectiveTheme, map, getSupportedCountryCodes]);

  // Update country overlay when countries data changes (only in globe mode)
  useEffect(() => {
    if (!map || !mapReady) return;
    // Only apply country overlay in globe mode
    if (currentStyleModeRef.current === 'globe') {
      applyCountryOverlay(map, currentThemeRef.current, getSupportedCountryCodes());
    }
  }, [countries, map, mapReady, getSupportedCountryCodes]);

  return {
    map,
    mapReady,
    currentZoom,
    countryLayerReady,
    setCountryLayerReady,
    isChangingStyle,
  };
}
