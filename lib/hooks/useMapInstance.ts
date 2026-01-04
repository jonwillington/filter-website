import { useEffect, useRef, useState, RefObject } from 'react';
import mapboxgl from 'mapbox-gl';

// Map styles for light/dark modes - both use dark backgrounds
const MAP_STYLES = {
  dark: 'mapbox://styles/mapbox/dark-v11',
  light: 'mapbox://styles/mapbox/dark-v11',
};

export interface UseMapInstanceOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  center: [number, number];
  zoom: number;
  effectiveTheme: 'light' | 'dark';
}

export interface UseMapInstanceReturn {
  map: mapboxgl.Map | null;
  mapReady: boolean;
  currentZoom: number;
  countryLayerReady: boolean;
  setCountryLayerReady: (ready: boolean) => void;
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
}: UseMapInstanceOptions): UseMapInstanceReturn {
  // Use state for map instance so dependent effects re-run when map is ready
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const currentThemeRef = useRef(effectiveTheme);
  const [mapReady, setMapReady] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(zoom);
  const [countryLayerReady, setCountryLayerReady] = useState(false);
  const initializedRef = useRef(false);

  // Initialize map (only once)
  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;

    // Set token lazily to avoid module-level side effects (breaks HMR)
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

    const styleUrl = MAP_STYLES[effectiveTheme] || MAP_STYLES.dark;
    currentThemeRef.current = effectiveTheme;

    const newMap = new mapboxgl.Map({
      container: containerRef.current,
      style: styleUrl,
      center,
      zoom,
      attributionControl: false,
    });

    // Add padding to account for floating sidebar on the left
    newMap.setPadding({ left: 200, right: 0, top: 0, bottom: 0 });

    newMap.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      'top-right'
    );

    newMap.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      'bottom-right'
    );

    // Handle browser zoom changes to keep markers positioned correctly
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
      const newZoom = newMap.getZoom();
      setCurrentZoom(newZoom);
    });

    // When map loads or style changes, mark it ready
    const markReady = () => {
      setMapReady(true);
      setTimeout(() => {
        setCountryLayerReady(true);
      }, 500);
    };

    newMap.on('load', markReady);
    newMap.on('style.load', markReady);

    // Set the map instance in state so dependent effects can access it
    setMap(newMap);

    return () => {
      clearInterval(zoomCheckInterval);
      setMapReady(false);
      setCountryLayerReady(false);
      newMap.remove();
      setMap(null);
      initializedRef.current = false;
    };
  }, [zoom]); // Only recreate map if initial zoom changes

  // Handle theme changes by updating the map style
  useEffect(() => {
    if (!map) return;
    if (currentThemeRef.current === effectiveTheme) return;

    currentThemeRef.current = effectiveTheme;
    const styleUrl = MAP_STYLES[effectiveTheme] || MAP_STYLES.dark;

    // Temporarily mark as not ready while style loads
    setMapReady(false);

    // Change the style - this triggers 'style.load' event which will re-setup layers
    map.setStyle(styleUrl);
  }, [effectiveTheme, map]);

  return {
    map,
    mapReady,
    currentZoom,
    countryLayerReady,
    setCountryLayerReady,
  };
}
