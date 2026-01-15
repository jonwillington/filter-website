import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

export interface UseMapPositionOptions {
  map: mapboxgl.Map | null;
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
 * Hook to manage map center and zoom position updates.
 * Handles smooth transitions. City-level changes (zoom changes or major center changes)
 * animate immediately, while shop-level pans can be queued during loading.
 */
export function useMapPosition({
  map,
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
    if (!map) return;

    const isZoomChange = Math.abs(zoom - lastZoom.current) > 0.5;
    // Detect major center changes (city-to-city navigation) - ~50km at equator
    const isMajorCenterChange = getDistance(center, lastCenter.current) > 0.5;

    // City-level changes (zoom changes OR major center changes) should animate immediately
    // Only queue minor pans (shop-to-shop in same area) during loading
    if (isLoading && !isZoomChange && !isMajorCenterChange) {
      // Only queue minor same-zoom transitions during loading
      pendingCenter.current = center;
      pendingZoom.current = zoom;
    } else {
      if (isZoomChange || isMajorCenterChange) {
        // Full flyTo for location/zoom changes or city-to-city - animate immediately
        map.flyTo({
          center,
          zoom,
          duration: 800,
          padding: { left: 200, right: 0, top: 0, bottom: 0 },
        });
      } else {
        // Quick easeTo for shop-to-shop (same zoom, minor distance)
        map.easeTo({
          center,
          zoom,
          duration: 400,
          padding: { left: 200, right: 0, top: 0, bottom: 0 },
        });
      }

      lastCenter.current = center;
      lastZoom.current = zoom;

      pendingCenter.current = null;
      pendingZoom.current = null;
    }
  }, [center, zoom, isLoading, map]);

  // Apply pending updates when loading completes
  useEffect(() => {
    if (!map || isLoading) return;

    if (pendingCenter.current && pendingZoom.current !== null) {
      const isZoomChange = Math.abs(pendingZoom.current - lastZoom.current) > 0.5;
      const isMajorCenterChange = getDistance(pendingCenter.current, lastCenter.current) > 0.5;

      if (isZoomChange || isMajorCenterChange) {
        map.flyTo({
          center: pendingCenter.current,
          zoom: pendingZoom.current,
          duration: 800,
          padding: { left: 200, right: 0, top: 0, bottom: 0 },
        });
      } else {
        map.easeTo({
          center: pendingCenter.current,
          zoom: pendingZoom.current,
          duration: 400,
          padding: { left: 200, right: 0, top: 0, bottom: 0 },
        });
      }

      lastCenter.current = pendingCenter.current;
      lastZoom.current = pendingZoom.current;

      pendingCenter.current = null;
      pendingZoom.current = null;
    }
  }, [isLoading, map]);
}
