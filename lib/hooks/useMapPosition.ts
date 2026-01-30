import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

export interface UseMapPositionOptions {
  map: mapboxgl.Map | null;
  mapReady: boolean;
  center: [number, number];
  zoom: number;
  isLoading: boolean;
}

/**
 * Calculate Euclidean distance between two coordinates.
 * Used to detect major center changes (city-to-city navigation).
 */
function getDistance(c1: [number, number], c2: [number, number]): number {
  const dx = c1[0] - c2[0];
  const dy = c1[1] - c2[1];
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Easing functions for natural map animations
 */
const easing = {
  // Smooth ease-out cubic - natural deceleration
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  // Ease-in-out cubic - smooth start and end
  inOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
};

/**
 * Hook to manage map center and zoom position updates.
 * Handles smooth transitions. City-level changes (zoom changes or major center changes)
 * animate immediately, while shop-level pans can be queued during loading.
 */
export function useMapPosition({
  map,
  mapReady,
  center,
  zoom,
  isLoading,
}: UseMapPositionOptions): void {
  const pendingCenter = useRef<[number, number] | null>(null);
  const pendingZoom = useRef<number | null>(null);
  const lastCenter = useRef<[number, number]>(center);
  const lastZoom = useRef<number>(zoom);

  // Update center when it changes
  useEffect(() => {
    // Wait for map AND style to be fully loaded before animating
    if (!map || !mapReady) return;

    // Additional safety check - verify style is actually loaded
    if (!map.isStyleLoaded()) {
      // Queue the position update to run when style loads
      const onStyleLoad = () => {
        map.off('style.load', onStyleLoad);
        // Trigger re-run by updating refs (the effect will re-run due to dependency changes)
      };
      map.once('style.load', onStyleLoad);
      return;
    }

    // Get current map zoom - don't zoom out if user has zoomed in further
    const currentMapZoom = map.getZoom();
    const effectiveZoom = Math.max(zoom, currentMapZoom);

    const isZoomChange = Math.abs(effectiveZoom - lastZoom.current) > 0.5;
    // Detect major center changes (city-to-city navigation) - ~50km at equator
    const isMajorCenterChange = getDistance(center, lastCenter.current) > 0.5;

    // City-level changes (zoom changes OR major center changes) should animate immediately
    // Only queue minor pans (shop-to-shop in same area) during loading
    if (isLoading && !isZoomChange && !isMajorCenterChange) {
      // Only queue minor same-zoom transitions during loading
      pendingCenter.current = center;
      pendingZoom.current = effectiveZoom;
    } else {
      if (isZoomChange || isMajorCenterChange) {
        // Full flyTo for location/zoom changes or city-to-city - animate immediately
        map.flyTo({
          center,
          zoom: effectiveZoom,
          duration: 1600,
          padding: { left: 200, right: 0, top: 0, bottom: 0 },
          essential: true,
          easing: easing.inOutCubic,
        });
      } else {
        // Smooth easeTo for shop-to-shop (same zoom, minor distance)
        map.easeTo({
          center,
          zoom: effectiveZoom,
          duration: 1000,
          padding: { left: 200, right: 0, top: 0, bottom: 0 },
          easing: easing.outCubic,
        });
      }

      lastCenter.current = center;
      lastZoom.current = effectiveZoom;

      pendingCenter.current = null;
      pendingZoom.current = null;
    }
  }, [center, zoom, isLoading, map, mapReady]);

  // Apply pending updates when loading completes
  useEffect(() => {
    // Wait for map AND style to be ready
    if (!map || !mapReady || isLoading) return;

    // Additional safety check - verify style is actually loaded
    if (!map.isStyleLoaded()) return;

    if (pendingCenter.current && pendingZoom.current !== null) {
      const isZoomChange = Math.abs(pendingZoom.current - lastZoom.current) > 0.5;
      const isMajorCenterChange = getDistance(pendingCenter.current, lastCenter.current) > 0.5;

      if (isZoomChange || isMajorCenterChange) {
        map.flyTo({
          center: pendingCenter.current,
          zoom: pendingZoom.current,
          duration: 1600,
          padding: { left: 200, right: 0, top: 0, bottom: 0 },
          essential: true,
          easing: easing.inOutCubic,
        });
      } else {
        map.easeTo({
          center: pendingCenter.current,
          zoom: pendingZoom.current,
          duration: 1000,
          padding: { left: 200, right: 0, top: 0, bottom: 0 },
          easing: easing.outCubic,
        });
      }

      lastCenter.current = pendingCenter.current;
      lastZoom.current = pendingZoom.current;

      pendingCenter.current = null;
      pendingZoom.current = null;
    }
  }, [isLoading, map, mapReady]);
}
