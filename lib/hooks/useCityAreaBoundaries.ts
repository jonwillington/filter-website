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
 * Calculate convex hull of points using Graham scan algorithm
 * Returns points in counter-clockwise order (suitable for GeoJSON exterior ring)
 */
function calculateConvexHull(points: Array<[number, number]>): Array<[number, number]> {
  if (points.length < 3) return points;

  // Find the bottom-most point (or left-most in case of tie)
  let start = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i][1] < points[start][1] ||
        (points[i][1] === points[start][1] && points[i][0] < points[start][0])) {
      start = i;
    }
  }

  // Swap start point to index 0
  [points[0], points[start]] = [points[start], points[0]];
  const pivot = points[0];

  // Sort points by polar angle with respect to pivot
  const sorted = points.slice(1).sort((a, b) => {
    const angleA = Math.atan2(a[1] - pivot[1], a[0] - pivot[0]);
    const angleB = Math.atan2(b[1] - pivot[1], b[0] - pivot[0]);
    if (angleA !== angleB) return angleA - angleB;
    // If same angle, sort by distance
    const distA = (a[0] - pivot[0]) ** 2 + (a[1] - pivot[1]) ** 2;
    const distB = (b[0] - pivot[0]) ** 2 + (b[1] - pivot[1]) ** 2;
    return distA - distB;
  });

  // Cross product to determine turn direction
  const cross = (o: [number, number], a: [number, number], b: [number, number]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

  // Build hull
  const hull: Array<[number, number]> = [pivot];
  for (const point of sorted) {
    while (hull.length > 1 && cross(hull[hull.length - 2], hull[hull.length - 1], point) <= 0) {
      hull.pop();
    }
    hull.push(point);
  }

  // Close the polygon
  hull.push(hull[0]);
  return hull;
}

/**
 * Expand a polygon outward from its centroid by a scale factor
 */
function expandPolygon(points: Array<[number, number]>, scaleFactor: number): Array<[number, number]> {
  if (points.length < 3) return points;

  // Calculate centroid (excluding the closing point which duplicates the first)
  const uniquePoints = points.slice(0, -1);
  const centroid: [number, number] = [
    uniquePoints.reduce((sum, p) => sum + p[0], 0) / uniquePoints.length,
    uniquePoints.reduce((sum, p) => sum + p[1], 0) / uniquePoints.length,
  ];

  // Scale each point outward from centroid
  const expanded = uniquePoints.map((point): [number, number] => [
    centroid[0] + (point[0] - centroid[0]) * scaleFactor,
    centroid[1] + (point[1] - centroid[1]) * scaleFactor,
  ]);

  // Close the polygon
  expanded.push(expanded[0]);
  return expanded;
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

    // Create mask hole - use location boundary in overview, city area boundary when expanded
    let maskHoleCoords: number[][] | null = null;

    if (isOverviewMode) {
      // In overview mode, don't show mask - just show city area outlines
      // Location boundaries are typically simple boxes, not detailed polygons
      maskHoleCoords = null;
    } else {
      maskHoleCoords = allAreaCoordinates[0];
    }

    const maskGeojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: maskHoleCoords
        ? [
            {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'Polygon',
                coordinates: [worldBounds, maskHoleCoords],
              },
            },
          ]
        : [],
    };

    const outlineGeojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: outlineFeatures,
    };

    // Target opacities - show mask if we have coordinates (location or city area)
    const hasMask = maskHoleCoords !== null;
    const targetMaskOpacity = hasMask
      ? (isOverviewMode
          ? (effectiveTheme === 'dark' ? 0.25 : 0.18) // Lighter for location overview
          : (effectiveTheme === 'dark' ? 0.35 : 0.25)) // Stronger for single city area
      : 0;
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
