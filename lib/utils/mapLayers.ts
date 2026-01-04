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
 * Returns a cleanup function to remove event handlers.
 */
export function setupCountryLayer(
  map: mapboxgl.Map,
  config: CountryLayerConfig
): () => void {
  const { countries, displayedShops, onUnsupportedCountryClick } = config;

  console.log('[Country Layer] Setting up with', countries.length, 'countries and', displayedShops.length, 'shops');
  console.log('[Country Layer] Callback provided:', !!onUnsupportedCountryClick);

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

  // Transparent layer just for click detection on unsupported countries
  // Layer is added on top (no insertBefore) so it can receive clicks
  // Note: Using a small opacity so the layer is interactive
  map.addLayer({
    id: 'country-fills',
    type: 'fill',
    source: 'country-fills',
    'source-layer': 'country_boundaries',
    paint: {
      'fill-color': '#000000',
      'fill-opacity': 0.01,
    },
  });

  // Add click handler for unsupported countries
  const handleClick = (e: mapboxgl.MapLayerMouseEvent) => {
    console.log('[Country Layer] Click detected', e.features);
    if (!e.features || e.features.length === 0) {
      console.log('[Country Layer] No features in click');
      return;
    }

    const feature = e.features[0];
    const countryCode = feature.properties?.iso_3166_1;
    const countryName = feature.properties?.name_en;

    console.log('[Country Layer] Clicked country:', countryName, countryCode);
    console.log('[Country Layer] Supported countries:', supportedCountries);

    // Check if this is an unsupported country
    // Show modal if country is not in supported list
    if (countryCode && !supportedCountries.includes(countryCode)) {
      console.log('[Country Layer] Country is unsupported, calling handler');
      onUnsupportedCountryClick?.(countryName || countryCode, countryCode);
    } else {
      console.log('[Country Layer] Country is supported, not showing modal');
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

  console.log('[Country Layer] Event handlers registered');
  console.log('[Country Layer] Layer exists:', !!map.getLayer('country-fills'));

  // Return cleanup function for event handlers
  return () => {
    map.off('click', 'country-fills', handleClick);
    map.off('mouseenter', 'country-fills', handleMouseEnter);
    map.off('mouseleave', 'country-fills', handleMouseLeave);
  };
}

/**
 * Clean up the world overlay from the map (no longer used)
 */
export function cleanupWorldOverlay(map: mapboxgl.Map): void {
  // No-op - world overlay removed, country highlighting handled in useMapInstance
}

/**
 * Set up world overlay (no longer used - country highlighting handled in useMapInstance)
 */
export function setupWorldOverlay(
  map: mapboxgl.Map,
  config: WorldOverlayConfig
): void {
  // No-op - country highlighting is now handled entirely in useMapInstance
  // via the country-fill-supported and country-fill-unsupported layers
}
