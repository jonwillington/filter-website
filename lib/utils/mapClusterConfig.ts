import type { CircleLayerSpecification, SymbolLayerSpecification } from 'mapbox-gl';

// Industry standard clustering parameters (Mapbox/Supercluster best practices)
export const CLUSTER_RADIUS = 50; // Optimal radius for urban density (40-60 recommended)
export const CLUSTER_MAX_ZOOM = 14; // Continue clustering until street level (14-16 recommended)

// Cluster circle layer configuration
export const getClusterLayerConfig = (): Omit<CircleLayerSpecification, 'id' | 'source'> => ({
  type: 'circle',
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': ['coalesce', ['get', 'clusterColor'], '#8B6F47'],
    'circle-radius': [
      'interpolate',
      ['linear'],
      ['zoom'],
      0, 5,
      3, 7,
      4, 9,
      5, ['step', ['get', 'point_count'], 14, 10, 20, 50, 26, 100, 32],
      9, ['step', ['get', 'point_count'], 18, 10, 24, 30, 30, 50, 36],
      12, ['step', ['get', 'point_count'], 14, 5, 18, 10, 22, 20, 26],
      13, ['step', ['get', 'point_count'], 10, 3, 14, 5, 16, 10, 18],
      14, ['step', ['get', 'point_count'], 8, 3, 10, 5, 12, 10, 14],
      15, 0,
    ],
    'circle-stroke-width': [
      'interpolate',
      ['linear'],
      ['zoom'],
      0, 1.5,
      4, 2,
      5, 3,
      12, 2.5,
      14, 1.5,
      15, 0,
    ],
    'circle-stroke-color': '#fff',
    'circle-opacity': [
      'interpolate',
      ['linear'],
      ['zoom'],
      0, 0.75,
      4, 0.85,
      5, 0.9,
      11, 0.9,
      13, 0.85,
      14, 0.5,
      15, 0,
    ],
    'circle-color-transition': { duration: 0 },
    'circle-radius-transition': { duration: 0 },
    'circle-stroke-width-transition': { duration: 0 },
  },
});

// Unclustered point layer configuration
export const getUnclusteredPointLayerConfig = (): Omit<CircleLayerSpecification, 'id' | 'source'> => ({
  type: 'circle',
  filter: ['!', ['has', 'point_count']],
  paint: {
    'circle-color': ['coalesce', ['get', 'countryColor'], '#8B6F47'],
    'circle-radius': [
      'interpolate',
      ['linear'],
      ['zoom'],
      0, 5,
      3, 7,
      4, 9,
      5, 11,
      9, 14,
      12, 16,
      14, 16,
      15, 0,
    ],
    'circle-stroke-width': [
      'interpolate',
      ['linear'],
      ['zoom'],
      0, 1.5,
      5, 2.5,
      12, 2.5,
      14, 2.5,
      15, 0,
    ],
    'circle-stroke-color': '#fff',
    'circle-opacity': [
      'interpolate',
      ['linear'],
      ['zoom'],
      0, 0.75,
      5, 0.9,
      11, 0.9,
      13, 0.9,
      14, 0.7,
      15, 0,
    ],
  },
});

// Cluster count label layer configuration
export const getClusterCountLayerConfig = (): Omit<SymbolLayerSpecification, 'id' | 'source'> => ({
  type: 'symbol',
  filter: ['has', 'point_count'],
  layout: {
    'text-field': '{point_count_abbreviated}',
    'text-font': ['DIN Offc Pro Bold', 'Arial Unicode MS Bold'],
    'text-size': [
      'interpolate',
      ['linear'],
      ['zoom'],
      0, 0,
      4, 0,
      5, 12,
      8, 14,
      11, 13,
      12, 12,
      13, 10,
      14, 8,
      15, 0,
    ],
  },
  paint: {
    'text-color': '#ffffff',
    'text-opacity': [
      'interpolate',
      ['linear'],
      ['zoom'],
      0, 0,
      4, 0,
      5, 1,
      11, 1,
      13, 0.9,
      14, 0.5,
      15, 0,
    ],
  },
});

// Build GeoJSON from shops
export function buildShopsGeoJSON(shops: Array<{
  documentId: string;
  longitude?: number | null;
  latitude?: number | null;
  coordinates?: { lng: number; lat: number } | null;
  location?: { country?: { primaryColor?: string | null } | null } | null;
  city_area?: { location?: { country?: { primaryColor?: string | null } | null } | null } | null;
}>): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  shops.forEach((shop) => {
    let coords: [number, number] | null = null;
    if (shop.coordinates?.lng && shop.coordinates?.lat) {
      coords = [shop.coordinates.lng, shop.coordinates.lat];
    } else if (shop.longitude && shop.latitude) {
      coords = [shop.longitude, shop.latitude];
    }
    if (!coords) return;

    const countryColor =
      shop.location?.country?.primaryColor ||
      shop.city_area?.location?.country?.primaryColor ||
      '#8B6F47';

    features.push({
      type: 'Feature',
      properties: {
        id: shop.documentId,
        countryColor: countryColor,
      },
      geometry: {
        type: 'Point',
        coordinates: coords,
      },
    });
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}
