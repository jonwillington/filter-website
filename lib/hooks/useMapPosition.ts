import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

export interface UseMapPositionOptions {
  map: mapboxgl.Map | null;
  center: [number, number];
  zoom: number;
  isLoading: boolean;
}

/**
 * Hook to manage map center and zoom position updates.
 * Handles smooth transitions and pending updates during loading.
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

  // Update center when it changes
  useEffect(() => {
    if (!map) return;

    if (isLoading) {
      // Store pending updates during loading
      pendingCenter.current = center;
      pendingZoom.current = zoom;
    } else {
      // Always use smooth flyTo - no jarring fade transitions
      map.flyTo({
        center,
        zoom,
        duration: 1000,
        padding: { left: 200, right: 0, top: 0, bottom: 0 },
      });
      lastCenter.current = center;

      pendingCenter.current = null;
      pendingZoom.current = null;
    }
  }, [center, zoom, isLoading, map]);

  // Apply pending updates when loading completes
  useEffect(() => {
    if (!map || isLoading) return;

    if (pendingCenter.current && pendingZoom.current) {
      map.flyTo({
        center: pendingCenter.current,
        zoom: pendingZoom.current,
        duration: 1000,
        padding: { left: 200, right: 0, top: 0, bottom: 0 },
      });
      lastCenter.current = pendingCenter.current;

      pendingCenter.current = null;
      pendingZoom.current = null;
    }
  }, [isLoading, map]);
}
