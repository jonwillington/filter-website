import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { CityArea } from '../types';

export interface UseCityAreaBoundariesOptions {
  map: mapboxgl.Map | null;
  mapReady: boolean;
  cityAreas: CityArea[];
  expandedCityAreaId: string | null;
  effectiveTheme: 'light' | 'dark';
}

const CITY_AREA_SOURCE_ID = 'city-area-boundaries';
const CITY_AREA_MASK_LAYER_ID = 'city-area-mask';
const CITY_AREA_LINE_LAYER_ID = 'city-area-line';
const FADE_DURATION = 400; // ms for fade in/out animations

/**
 * Calculate the bounding box of a set of coordinates
 */
function calculateBounds(coordinates: Array<{ lat: number; lng: number }>): mapboxgl.LngLatBoundsLike {
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  coordinates.forEach((coord) => {
    minLng = Math.min(minLng, coord.lng);
    maxLng = Math.max(maxLng, coord.lng);
    minLat = Math.min(minLat, coord.lat);
    maxLat = Math.max(maxLat, coord.lat);
  });

  return [
    [minLng, minLat], // Southwest
    [maxLng, maxLat], // Northeast
  ];
}

/**
 * Hook to manage city area boundary visualization on the map.
 * Darkens the map everywhere EXCEPT the expanded city area to highlight it.
 */
export function useCityAreaBoundaries({
  map,
  mapReady,
  cityAreas,
  expandedCityAreaId,
  effectiveTheme,
}: UseCityAreaBoundariesOptions): void {
  const currentExpandedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!map || !mapReady) {
      return;
    }

    // Find the expanded city area
    const expandedArea = expandedCityAreaId
      ? cityAreas.find((area) => area.documentId === expandedCityAreaId)
      : null;

    const boundaries = expandedArea?.boundary_coordinates;
    const hasBoundaries = boundaries && boundaries.length >= 3;

    // Clean up existing layers if no boundaries to show
    if (!hasBoundaries) {
      fadeOutAndCleanup(map);
      currentExpandedIdRef.current = null;
      return;
    }

    // Skip if same area is already displayed
    if (currentExpandedIdRef.current === expandedCityAreaId) {
      return;
    }

    // Convert boundary coordinates to GeoJSON polygon
    // Mapbox expects [lng, lat] format, and polygons need the first point repeated at the end
    const areaCoordinates = boundaries.map((coord) => [coord.lng, coord.lat]);
    // Close the polygon by adding the first point at the end
    if (
      areaCoordinates[0][0] !== areaCoordinates[areaCoordinates.length - 1][0] ||
      areaCoordinates[0][1] !== areaCoordinates[areaCoordinates.length - 1][1]
    ) {
      areaCoordinates.push(areaCoordinates[0]);
    }

    // Create a "mask" polygon that covers the world with a hole for the city area
    // This darkens everything except the city area
    const worldBounds: [number, number][] = [
      [-180, -90],
      [-180, 90],
      [180, 90],
      [180, -90],
      [-180, -90],
    ];

    const maskGeojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            // First ring is the outer boundary (world), second ring is the hole (city area)
            coordinates: [worldBounds, areaCoordinates],
          },
        },
      ],
    };

    // Also create the city area outline for the border
    const outlineGeojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            name: expandedArea.name,
          },
          geometry: {
            type: 'Polygon',
            coordinates: [areaCoordinates],
          },
        },
      ],
    };

    // Get color from the city area's location country, or use default
    const primaryColor =
      expandedArea.location?.country?.primaryColor || '#3b82f6';

    // Target opacities for fade-in
    const targetMaskOpacity = effectiveTheme === 'dark' ? 0.35 : 0.25;
    const targetLineOpacity = 0.7;

    // Remove existing layers before adding new ones (instant cleanup for switching areas)
    cleanupLayersInstant(map);

    try {
      // Add the mask source (world with hole)
      map.addSource(CITY_AREA_SOURCE_ID, {
        type: 'geojson',
        data: maskGeojson,
      });

      // Add the outline source
      map.addSource(CITY_AREA_SOURCE_ID + '-outline', {
        type: 'geojson',
        data: outlineGeojson,
      });

      // Add subtle dark mask layer - start with opacity 0 for fade-in
      map.addLayer({
        id: CITY_AREA_MASK_LAYER_ID,
        type: 'fill',
        source: CITY_AREA_SOURCE_ID,
        paint: {
          'fill-color': '#000000',
          'fill-opacity': 0,
          'fill-opacity-transition': { duration: FADE_DURATION, delay: 0 },
        },
      });

      // Add subtle dotted border line - start with opacity 0 for fade-in
      map.addLayer({
        id: CITY_AREA_LINE_LAYER_ID,
        type: 'line',
        source: CITY_AREA_SOURCE_ID + '-outline',
        paint: {
          'line-color': primaryColor,
          'line-width': 2,
          'line-opacity': 0,
          'line-opacity-transition': { duration: FADE_DURATION, delay: 0 },
          'line-dasharray': [1, 2], // Dotted pattern: 1px dash, 2px gap (more dots)
        },
      });

      // Trigger fade-in after a brief moment (allows transition to take effect)
      requestAnimationFrame(() => {
        if (map.getLayer(CITY_AREA_MASK_LAYER_ID)) {
          map.setPaintProperty(CITY_AREA_MASK_LAYER_ID, 'fill-opacity', targetMaskOpacity);
        }
        if (map.getLayer(CITY_AREA_LINE_LAYER_ID)) {
          map.setPaintProperty(CITY_AREA_LINE_LAYER_ID, 'line-opacity', targetLineOpacity);
        }
      });

      // Smoothly zoom to fit the city area bounds
      const areaBounds = calculateBounds(boundaries);
      map.fitBounds(areaBounds, {
        padding: { top: 80, bottom: 80, left: 80, right: 80 },
        duration: 800, // Smooth 800ms animation
        maxZoom: 15, // Don't zoom in too close
      });

      currentExpandedIdRef.current = expandedCityAreaId;
    } catch (err) {
      console.error('[CityAreaBoundaries] Error adding layers:', err);
    }

    return () => {
      // Cleanup handled in the effect itself when area changes
    };
  }, [map, mapReady, cityAreas, expandedCityAreaId, effectiveTheme]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (map) {
        cleanupLayersInstant(map);
      }
    };
  }, [map]);
}

/**
 * Fade out layers then remove them (for smooth transitions)
 */
function fadeOutAndCleanup(map: mapboxgl.Map): void {
  try {
    // Start fade-out animation
    if (map.getLayer(CITY_AREA_MASK_LAYER_ID)) {
      map.setPaintProperty(CITY_AREA_MASK_LAYER_ID, 'fill-opacity', 0);
    }
    if (map.getLayer(CITY_AREA_LINE_LAYER_ID)) {
      map.setPaintProperty(CITY_AREA_LINE_LAYER_ID, 'line-opacity', 0);
    }

    // Remove layers after fade completes
    setTimeout(() => {
      cleanupLayersInstant(map);
    }, FADE_DURATION + 50);
  } catch (err) {
    // Fallback to instant cleanup if animation fails
    cleanupLayersInstant(map);
  }
}

/**
 * Instantly remove layers without animation (for switching between areas or unmount)
 */
function cleanupLayersInstant(map: mapboxgl.Map): void {
  try {
    if (map.getLayer(CITY_AREA_LINE_LAYER_ID)) {
      map.removeLayer(CITY_AREA_LINE_LAYER_ID);
    }
    if (map.getLayer(CITY_AREA_MASK_LAYER_ID)) {
      map.removeLayer(CITY_AREA_MASK_LAYER_ID);
    }
    if (map.getSource(CITY_AREA_SOURCE_ID + '-outline')) {
      map.removeSource(CITY_AREA_SOURCE_ID + '-outline');
    }
    if (map.getSource(CITY_AREA_SOURCE_ID)) {
      map.removeSource(CITY_AREA_SOURCE_ID);
    }
  } catch (err) {
    // Ignore errors during cleanup (map may already be destroyed)
  }
}
