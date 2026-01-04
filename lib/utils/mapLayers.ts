import mapboxgl from 'mapbox-gl';
import { Country, Location, Shop } from '../types';

/**
 * Configuration for country layer setup
 */
export interface CountryLayerConfig {
  countries: Country[];
  displayedShops: Shop[];
  onUnsupportedCountryClick?: (countryName: string, countryCode: string) => void;
}

/**
 * Configuration for world overlay setup
 */
export interface WorldOverlayConfig {
  locations: Location[];
  effectiveTheme: 'light' | 'dark';
}

/**
 * Safely check if the map style is loaded and available
 */
function isStyleAvailable(map: mapboxgl.Map): boolean {
  if (!map.isStyleLoaded()) return false;
  try {
    return !!map.getStyle();
  } catch {
    return false;
  }
}

/**
 * Clean up the country layer from the map
 */
export function cleanupCountryLayer(map: mapboxgl.Map): void {
  if (!isStyleAvailable(map)) return;

  if (map.getLayer('country-fills')) {
    map.removeLayer('country-fills');
  }
  if (map.getSource('country-fills')) {
    map.removeSource('country-fills');
  }
}

/**
 * Set up country boundaries highlighting layer.
 * Shows transparent clickable layer for unsupported countries.
 */
export function setupCountryLayer(
  map: mapboxgl.Map,
  config: CountryLayerConfig
): void {
  const { countries, displayedShops, onUnsupportedCountryClick } = config;

  // Remove existing layer and source if they exist
  cleanupCountryLayer(map);

  // Create a mapping of country codes to supported status
  // A country is supported if:
  // 1. It's explicitly marked as supported in the database, OR
  // 2. It has shops (auto-detect based on shop data)
  const countriesWithShops = new Set(
    displayedShops
      .map((shop) => shop.location?.country?.code || shop.country?.code)
      .filter(Boolean)
  );

  const supportedCountries = countries
    .filter((c) => c.supported || countriesWithShops.has(c.code))
    .map((c) => c.code);

  // Add source first
  map.addSource('country-fills', {
    type: 'vector',
    url: 'mapbox://mapbox.country-boundaries-v1',
  });

  // Add country boundary fill layer - darken unsupported countries
  const layers = map.getStyle().layers;

  // Find a good insertion point - after background/water but before roads
  const insertBefore = layers?.find(
    (layer: mapboxgl.AnyLayer) =>
      layer.id.includes('landuse') ||
      layer.id.includes('landcover') ||
      layer.id.includes('land-structure') ||
      layer.type === 'line'
  );

  // Transparent layer just for click detection on unsupported countries
  // (Visual overlay is now handled by world-overlay with city boundary holes)
  map.addLayer(
    {
      id: 'country-fills',
      type: 'fill',
      source: 'country-fills',
      'source-layer': 'country_boundaries',
      paint: {
        'fill-color': 'transparent',
        'fill-opacity': 0,
      },
    },
    insertBefore?.id
  );

  // Add click handler for unsupported countries
  const handleClick = (e: mapboxgl.MapLayerMouseEvent) => {
    if (!e.features || e.features.length === 0) return;

    const feature = e.features[0];
    const countryCode = feature.properties?.iso_3166_1;
    const countryName = feature.properties?.name_en;

    // Check if this is an unsupported country
    // Show modal if country is not in supported list
    if (countryCode && !supportedCountries.includes(countryCode)) {
      onUnsupportedCountryClick?.(countryName || countryCode, countryCode);
    }
  };

  // Change cursor to pointer on unsupported countries
  const handleMouseEnter = (e: mapboxgl.MapLayerMouseEvent) => {
    if (!e.features || e.features.length === 0) return;
    const countryCode = e.features[0].properties?.iso_3166_1;
    if (countryCode && !supportedCountries.includes(countryCode)) {
      map.getCanvas().style.cursor = 'pointer';
    }
  };

  const handleMouseLeave = () => {
    map.getCanvas().style.cursor = '';
  };

  map.on('click', 'country-fills', handleClick);
  map.on('mouseenter', 'country-fills', handleMouseEnter);
  map.on('mouseleave', 'country-fills', handleMouseLeave);
}

/**
 * Clean up the world overlay from the map
 */
export function cleanupWorldOverlay(map: mapboxgl.Map): void {
  if (!isStyleAvailable(map)) return;

  if (map.getLayer('world-overlay')) map.removeLayer('world-overlay');
  if (map.getLayer('city-boundaries-line')) map.removeLayer('city-boundaries-line');
  if (map.getSource('world-overlay')) map.removeSource('world-overlay');
  if (map.getSource('city-boundaries-outline')) map.removeSource('city-boundaries-outline');
}

/**
 * Set up world overlay with city boundary holes.
 * Creates a brown overlay covering everywhere EXCEPT supported city boundaries.
 */
export function setupWorldOverlay(
  map: mapboxgl.Map,
  config: WorldOverlayConfig
): void {
  const { locations, effectiveTheme } = config;

  cleanupWorldOverlay(map);

  // Filter locations that have boundary coordinates (array of points)
  const locationsWithBoundaries = locations.filter(
    (loc) => Array.isArray(loc.coordinates) && loc.coordinates.length >= 3
  );

  console.log('World overlay setup:', {
    totalLocations: locations.length,
    locationsWithBoundaries: locationsWithBoundaries.length,
    boundaryNames: locationsWithBoundaries.map((l) => l.name),
    sampleCoords: locationsWithBoundaries[0]?.coordinates,
  });

  // Create a world polygon with city boundaries as holes
  // World polygon covers the entire globe
  const worldPolygon: number[][] = [
    [-180, -90],
    [180, -90],
    [180, 90],
    [-180, 90],
    [-180, -90],
  ];

  // City boundaries become holes in the world polygon
  const holes: number[][][] = locationsWithBoundaries.map((loc) => {
    const coords = loc.coordinates as Array<{ lat: number; lng: number }>;
    // GeoJSON uses [lng, lat] order, holes must be counter-clockwise (reversed)
    return coords.map((c) => [c.lng, c.lat]).reverse();
  });

  // GeoJSON polygon with holes: first ring is outer, subsequent rings are holes
  const polygonCoordinates = [worldPolygon, ...holes];

  const geojson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: polygonCoordinates,
        },
      },
    ],
  };

  map.addSource('world-overlay', {
    type: 'geojson',
    data: geojson,
  });

  const isDark = effectiveTheme === 'dark';

  // Find a good insertion point - below roads and labels
  const layers = map.getStyle().layers;
  const insertBefore = layers?.find(
    (layer: mapboxgl.AnyLayer) =>
      layer.id.includes('road') ||
      layer.id.includes('bridge') ||
      layer.type === 'line' ||
      layer.type === 'symbol'
  );

  // Add the brown overlay (covers world except city holes)
  map.addLayer(
    {
      id: 'world-overlay',
      type: 'fill',
      source: 'world-overlay',
      paint: {
        'fill-color': isDark ? '#3D2E24' : '#F5EDE5',
        'fill-opacity': isDark ? 0.85 : 0.8,
      },
    },
    insertBefore?.id
  );

  // Add city boundary outlines for visual clarity
  if (locationsWithBoundaries.length > 0) {
    const cityBoundariesGeojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: locationsWithBoundaries.map((loc) => {
        const coords = loc.coordinates as Array<{ lat: number; lng: number }>;
        return {
          type: 'Feature' as const,
          properties: { name: loc.name },
          geometry: {
            type: 'Polygon' as const,
            coordinates: [coords.map((c) => [c.lng, c.lat])],
          },
        };
      }),
    };

    if (!map.getSource('city-boundaries-outline')) {
      map.addSource('city-boundaries-outline', {
        type: 'geojson',
        data: cityBoundariesGeojson,
      });
    }

    map.addLayer({
      id: 'city-boundaries-line',
      type: 'line',
      source: 'city-boundaries-outline',
      paint: {
        'line-color': isDark ? '#6B5548' : '#B8A898',
        'line-width': 1.5,
        'line-opacity': 0.5,
      },
    });
  }
}
