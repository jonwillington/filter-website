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
  const lastZoom = useRef<number>(zoom);

  // Update center when it changes
  useEffect(() => {
    if (!map) return;

    if (isLoading) {
      // Store pending updates during loading
      pendingCenter.current = center;
      pendingZoom.current = zoom;
    } else {
      // Use easeTo for same-zoom transitions (shop-to-shop), flyTo for zoom changes (city changes)
      const isZoomChange = Math.abs(zoom - lastZoom.current) > 0.5;

      if (isZoomChange) {
        // Full flyTo for location/zoom changes
        map.flyTo({
          center,
          zoom,
          duration: 1000,
          padding: { left: 200, right: 0, top: 0, bottom: 0 },
        });
      } else {
        // Quick easeTo for shop-to-shop (same zoom)
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

      if (isZoomChange) {
        map.flyTo({
          center: pendingCenter.current,
          zoom: pendingZoom.current,
          duration: 1000,
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
