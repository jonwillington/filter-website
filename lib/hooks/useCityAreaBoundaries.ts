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

    // Get city areas with valid boundaries
    const areasWithBoundaries = cityAreas.filter(
      (area) => area.boundary_coordinates && area.boundary_coordinates.length >= 3
    );

    // No boundaries to show at all
    if (areasWithBoundaries.length === 0) {
      fadeOutAndCleanup(map);
      currentExpandedIdRef.current = null;
      return;
    }

    // Determine mode: single expanded area or all areas overview
    const expandedArea = expandedCityAreaId
      ? areasWithBoundaries.find((area) => area.documentId === expandedCityAreaId)
      : null;

    const isOverviewMode = !expandedArea;
    const displayAreas = expandedArea ? [expandedArea] : areasWithBoundaries;

    // Create a stable key for the current display state
    const displayKey = isOverviewMode ? 'overview' : expandedCityAreaId;

    // Skip if same state is already displayed
    if (currentExpandedIdRef.current === displayKey) {
      return;
    }

    // Get primary color from first area's location country
    const primaryColor =
      displayAreas[0]?.location?.country?.primaryColor || '#3b82f6';

    // Build GeoJSON for all areas to display
    const allAreaCoordinates: number[][][] = [];
    const outlineFeatures: GeoJSON.Feature[] = [];

    displayAreas.forEach((area) => {
      const boundaries = area.boundary_coordinates!;
      const areaCoordinates = boundaries.map((coord) => [coord.lng, coord.lat]);

      // Close the polygon
      if (
        areaCoordinates[0][0] !== areaCoordinates[areaCoordinates.length - 1][0] ||
        areaCoordinates[0][1] !== areaCoordinates[areaCoordinates.length - 1][1]
      ) {
        areaCoordinates.push(areaCoordinates[0]);
      }

      allAreaCoordinates.push(areaCoordinates);
      outlineFeatures.push({
        type: 'Feature',
        properties: { name: area.name },
        geometry: {
          type: 'Polygon',
          coordinates: [areaCoordinates],
        },
      });
    });

    // Create mask with holes for all displayed areas (only for single expanded area)
    const worldBounds: [number, number][] = [
      [-180, -90],
      [-180, 90],
      [180, 90],
      [180, -90],
      [-180, -90],
    ];

    // Create mask with holes for all city areas (darkens everything outside)
    const maskGeojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [worldBounds, ...allAreaCoordinates],
          },
        },
      ],
    };

    const outlineGeojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: outlineFeatures,
    };

    // Target opacities - no mask in overview mode (only show when single area expanded)
    const targetMaskOpacity = isOverviewMode
      ? 0
      : (effectiveTheme === 'dark' ? 0.35 : 0.25);
    const targetLineOpacity = isOverviewMode ? 0.4 : 0.7;
    const lineWidth = isOverviewMode ? 1.5 : 2;

    // Remove existing layers
    cleanupLayersInstant(map);

    try {
      // Add sources
      map.addSource(CITY_AREA_SOURCE_ID, {
        type: 'geojson',
        data: maskGeojson,
      });

      map.addSource(CITY_AREA_SOURCE_ID + '-outline', {
        type: 'geojson',
        data: outlineGeojson,
      });

      // Add mask layer (only visible when single area is expanded)
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

      // Add dotted border lines for all areas
      map.addLayer({
        id: CITY_AREA_LINE_LAYER_ID,
        type: 'line',
        source: CITY_AREA_SOURCE_ID + '-outline',
        paint: {
          'line-color': primaryColor,
          'line-width': lineWidth,
          'line-opacity': 0,
          'line-opacity-transition': { duration: FADE_DURATION, delay: 0 },
          'line-dasharray': [1, 2],
        },
      });

      // Trigger fade-in
      requestAnimationFrame(() => {
        if (map.getLayer(CITY_AREA_MASK_LAYER_ID)) {
          map.setPaintProperty(CITY_AREA_MASK_LAYER_ID, 'fill-opacity', targetMaskOpacity);
        }
        if (map.getLayer(CITY_AREA_LINE_LAYER_ID)) {
          map.setPaintProperty(CITY_AREA_LINE_LAYER_ID, 'line-opacity', targetLineOpacity);
        }
      });

      // Zoom to fit bounds - all areas in overview, single area when expanded
      if (expandedArea) {
        const areaBounds = calculateBounds(expandedArea.boundary_coordinates!);
        map.fitBounds(areaBounds, {
          padding: { top: 80, bottom: 80, left: 80, right: 80 },
          duration: 800,
          maxZoom: 15,
        });
      }
      // In overview mode, don't change zoom - let the location selection handle it

      currentExpandedIdRef.current = displayKey;
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
