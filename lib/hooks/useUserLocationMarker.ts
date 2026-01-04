import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

export interface UseUserLocationMarkerOptions {
  map: mapboxgl.Map | null;
  mapReady: boolean;
  coordinates: { lat: number; lng: number } | null;
}

/**
 * Hook to display user's GPS location on the map with a prominent pulsing marker.
 */
export function useUserLocationMarker({
  map,
  mapReady,
  coordinates,
}: UseUserLocationMarkerOptions): void {
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!map || !mapReady) return;

    // Remove existing marker if coordinates are null
    if (!coordinates) {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      return;
    }

    // Create custom marker element with pulsing animation
    const el = document.createElement('div');
    el.className = 'user-location-marker';
    el.innerHTML = `
      <div class="user-location-pulse"></div>
      <div class="user-location-pulse-ring"></div>
      <div class="user-location-dot"></div>
    `;

    // Remove existing marker before creating new one
    if (markerRef.current) {
      markerRef.current.remove();
    }

    // Create and add the marker
    markerRef.current = new mapboxgl.Marker({
      element: el,
      anchor: 'center',
    })
      .setLngLat([coordinates.lng, coordinates.lat])
      .addTo(map);

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, [map, mapReady, coordinates]);

  // Update marker position when coordinates change
  useEffect(() => {
    if (markerRef.current && coordinates) {
      markerRef.current.setLngLat([coordinates.lng, coordinates.lat]);
    }
  }, [coordinates]);
}
