import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { CityArea } from '../types';

export interface UseCityAreaBoundariesOptions {
  map: mapboxgl.Map | null;
  mapReady: boolean;
  cityAreas: CityArea[];
  expandedCityAreaId: string | null;
  effectiveTheme: 'light' | 'dark';
  selectedShop?: { documentId: string } | null;
}

// Track selectedShop via ref to avoid re-running boundary effect on every shop change

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
 * Check if a ring of coordinates is clockwise.
 * Uses the shoelace formula — positive area = clockwise in [lng, lat] space.
 */
function isClockwise(ring: number[][]): boolean {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    sum += (x2 - x1) * (y2 + y1);
  }
  return sum > 0;
}

/**
 * Ensure a ring has the desired winding order.
 * For GeoJSON RFC 7946: exterior = CCW, holes = CW.
 */
function ensureWinding(ring: number[][], clockwise: boolean): number[][] {
  if (isClockwise(ring) !== clockwise) {
    return [...ring].reverse();
  }
  return ring;
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
  selectedShop,
}: UseCityAreaBoundariesOptions): void {
  const currentExpandedIdRef = useRef<string | null>(null);
  const lastBoundaryDataRef = useRef<Array<{ lat: number; lng: number }> | null>(null);
  const selectedShopRef = useRef(selectedShop);
  selectedShopRef.current = selectedShop;

  useEffect(() => {
    if (!map || !mapReady) {
      return;
    }

    console.log('[CityAreaBoundaries] Effect:', { expandedCityAreaId, mapReady, cityAreasCount: cityAreas.length });

    // Only skip if ID unchanged AND layers still exist on the map
    // (style changes destroy layers, so we must re-draw even if ID is the same)
    // Guard map.getLayer with try-catch — it throws if map style is mid-swap
    let layerExists = false;
    try {
      layerExists = !!map.getLayer(CITY_AREA_MASK_LAYER_ID);
    } catch {
      // Style not loaded yet — let effect proceed to re-draw when ready
    }
    if (
      expandedCityAreaId === currentExpandedIdRef.current &&
      currentExpandedIdRef.current !== null &&
      layerExists
    ) {
      return;
    }

    // Get city areas with valid boundaries
    const areasWithBoundaries = cityAreas.filter(
      (area) => area.boundary_coordinates && area.boundary_coordinates.length >= 3
    );

    // If expandedCityAreaId is null, fade out
    if (!expandedCityAreaId) {
      if (currentExpandedIdRef.current !== null) {
        // Fade out boundary
        fadeOutAndCleanup(map);
        currentExpandedIdRef.current = null;
        lastBoundaryDataRef.current = null;
      }
      return;
    }

    // Find the expanded area
    const expandedArea = areasWithBoundaries.find((area) => area.documentId === expandedCityAreaId);

    if (!expandedArea) {
      console.warn('[CityAreaBoundaries] Area not found:', {
        expandedCityAreaId,
        cityAreasCount: cityAreas.length,
        areasWithBoundaries: areasWithBoundaries.length,
        availableIds: areasWithBoundaries.map(a => a.documentId),
      });
      if (lastBoundaryDataRef.current && currentExpandedIdRef.current === expandedCityAreaId) {
        return;
      }
      fadeOutAndCleanup(map);
      currentExpandedIdRef.current = null;
      lastBoundaryDataRef.current = null;
      return;
    }

    // Draw boundary for the expanded area

    // Cache the boundary data
    lastBoundaryDataRef.current = expandedArea.boundary_coordinates!;

    const displayAreas = [expandedArea];

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
    // RFC 7946: exterior ring = CCW, holes = CW
    const worldBounds: number[][] = [
      [-180, -90],
      [-180, 90],
      [180, 90],
      [180, -90],
      [-180, -90],
    ];
    const worldBoundsCCW = ensureWinding(worldBounds, false); // exterior = CCW

    // Create mask hole using city area boundary — must be CW for hole to cut through
    const rawHoleCoords = allAreaCoordinates[0];
    const maskHoleCoords = rawHoleCoords ? ensureWinding(rawHoleCoords, true) : null; // hole = CW

    const maskGeojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: maskHoleCoords
        ? [
            {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'Polygon',
                coordinates: [worldBoundsCCW, maskHoleCoords],
              },
            },
          ]
        : [],
    };

    const outlineGeojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: outlineFeatures,
    };

    // Target opacities for single city area highlight
    const hasMask = maskHoleCoords !== null;
    const targetMaskOpacity = hasMask
      ? (effectiveTheme === 'dark' ? 0.35 : 0.25)
      : 0;
    const targetLineOpacity = 0.7;
    const lineWidth = 2;

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

      // Find the first clustering layer to insert boundary layers below markers
      const firstClusterLayer = map.getLayer('clusters') ? 'clusters' : undefined;

      // Add mask layer below markers (set target opacity directly — skip animation for debugging)
      map.addLayer({
        id: CITY_AREA_MASK_LAYER_ID,
        type: 'fill',
        source: CITY_AREA_SOURCE_ID,
        paint: {
          'fill-color': '#000000',
          'fill-opacity': targetMaskOpacity,
          'fill-opacity-transition': { duration: FADE_DURATION, delay: 0 },
        },
      }, firstClusterLayer);

      // Add dotted border lines below markers
      map.addLayer({
        id: CITY_AREA_LINE_LAYER_ID,
        type: 'line',
        source: CITY_AREA_SOURCE_ID + '-outline',
        paint: {
          'line-color': primaryColor,
          'line-width': lineWidth,
          'line-opacity': targetLineOpacity,
          'line-opacity-transition': { duration: FADE_DURATION, delay: 0 },
          'line-dasharray': [1, 2],
        },
      }, firstClusterLayer);

      // Zoom to fit the expanded city area bounds (only when no shop is selected)
      if (!selectedShopRef.current) {
        const areaBounds = calculateBounds(expandedArea.boundary_coordinates!);
        map.fitBounds(areaBounds, {
          padding: { top: 80, bottom: 80, left: 280, right: 80 },
          duration: 800,
          maxZoom: 15,
        });
      }

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
