'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { Spinner } from '@heroui/react';
import { Shop, Country } from '@/lib/types';
import { getMediaUrl } from '@/lib/utils';
import {
  calculateDistance,
  getShopCoords,
  calculateLocalDensity,
  getZoomBracket,
} from '@/lib/utils/mapGeometry';

// Mapbox token is set lazily in useEffect to avoid module-level side effects

interface MapContainerProps {
  shops: Shop[];
  selectedShop: Shop | null;
  onShopSelect: (shop: Shop) => void;
  center?: [number, number];
  zoom?: number;
  isLoading?: boolean;
  onTransitionComplete?: () => void;
  countries?: Country[];
  onUnsupportedCountryClick?: (countryName: string, countryCode: string) => void;
}

// Industry standard clustering parameters (Mapbox/Supercluster best practices)
const CLUSTER_RADIUS = 50; // Optimal radius for urban density (40-60 recommended)
const CLUSTER_MAX_ZOOM = 14; // Continue clustering until street level (14-16 recommended)

export function MapContainer({
  shops,
  selectedShop,
  onShopSelect,
  center = [0, 20],
  zoom = 2,
  isLoading = false,
  onTransitionComplete,
  countries = [],
  onUnsupportedCountryClick,
}: MapContainerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const selectedMarkerRef = useRef<string | null>(null);
  const shopsRef = useRef<Shop[]>(shops);
  const isZooming = useRef<boolean>(false);
  const isDragging = useRef<boolean>(false);
  const pendingCenter = useRef<[number, number] | null>(null);
  const pendingZoom = useRef<number | null>(null);
  const [displayedShops, setDisplayedShops] = useState<Shop[]>(shops);
  const isTransitioning = useRef<boolean>(false);
  const hasCalledTransitionComplete = useRef<boolean>(false);
  const lastCenter = useRef<[number, number]>(center);
  const [currentZoom, setCurrentZoom] = useState(zoom);
  const [countryLayerReady, setCountryLayerReady] = useState(false);
  const [mapReady, setMapReady] = useState(false); // Track when map is ready for clustering
  // Track zoom bracket for marker size updates (uses imported getZoomBracket)
  const wasAboveZoomThreshold = useRef(getZoomBracket(zoom));

  // Keep shopsRef in sync
  useEffect(() => {
    shopsRef.current = shops;
  }, [shops]);

  // Update displayed shops - always keep in sync
  useEffect(() => {
    // Always update displayed shops to stay in sync, even during loading
    // This prevents markers from disappearing when switching locations
    setDisplayedShops(shops);
  }, [shops]);

  // Track loading state changes
  useEffect(() => {
    if (isLoading) {
      isTransitioning.current = true;
      hasCalledTransitionComplete.current = false;
    }
  }, [isLoading]);

  // Note: calculateDistance, getShopCoords, and calculateLocalDensity are now imported from mapGeometry

  // Create marker element
  const createMarkerElement = useCallback(
    (shop: Shop, isSelected: boolean, fadeIn: boolean = false, density: number = 0, zoomLevel: number = 12) => {
      // Density threshold - use simple markers when there are many nearby shops
      // Higher threshold (30) means logos appear in moderately dense areas too
      const HIGH_DENSITY_THRESHOLD = 30;
      const ZOOM_THRESHOLD = 15; // Below this zoom, always use simple markers (labels hidden)
      const LOGO_ZOOM_THRESHOLD = 17; // Above this zoom, show logos even in high density areas

      // Use simple markers if: zoomed out OR (high density AND not super zoomed in)
      const useSimpleMarker = zoomLevel < ZOOM_THRESHOLD || (density > HIGH_DENSITY_THRESHOLD && zoomLevel < LOGO_ZOOM_THRESHOLD);

      const logoUrl = getMediaUrl(shop.brand?.logo);

      if (useSimpleMarker) {
        // Simple marker for high-density areas - use country's primary color
        const el = document.createElement('div');
        el.className = `shop-marker${isSelected ? ' selected' : ''}`;
        const countryColor = shop.location?.country?.primaryColor ||
                            shop.city_area?.location?.country?.primaryColor ||
                            '#FF6B6B';
        const markerColor = isSelected ? '#8B6F47' : countryColor;

        // Scale marker size based on zoom level
        let markerSize = 22;
        let borderWidth = 2;
        if (zoomLevel < 3) {
          markerSize = 8;
          borderWidth = 1;
        } else if (zoomLevel < 5) {
          markerSize = 10;
          borderWidth = 1.5;
        } else if (zoomLevel < 7) {
          markerSize = 14;
          borderWidth = 1.5;
        } else if (zoomLevel < 10) {
          markerSize = 18;
          borderWidth = 2;
        }

        el.style.cssText = `
          width: ${markerSize}px;
          height: ${markerSize}px;
          border-radius: 50%;
          background: ${markerColor};
          border: ${borderWidth}px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          cursor: pointer;
          transition: background-color 0.2s ease, opacity 0.2s ease;
          opacity: ${fadeIn ? '0' : '1'};
          transform-origin: center center;
          position: absolute;
          transform: translate3d(0, 0, 0) ${isSelected ? 'scale(1.3)' : 'scale(1)'};
          contain: layout style paint;
        `;
        el.style.zIndex = isSelected ? '10' : '1';

        // Fade in after a brief delay if fadeIn is true
        if (fadeIn) {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              el.style.opacity = '1';
            });
          });
        }

        return el;
      } else {
        // Detailed marker with logo and text label
        const container = document.createElement('div');
        container.className = `shop-marker${isSelected ? ' selected' : ''}`;
        container.style.cssText = `
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          position: absolute;
          opacity: ${fadeIn ? '0' : '1'};
          transition: opacity 0.2s ease;
        `;
        container.style.zIndex = isSelected ? '10' : '1';

        // Create logo circle
        const logoEl = document.createElement('div');
        const baseStyles = `
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 3px solid ${isSelected ? '#8B6F47' : 'white'};
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          transition: border-color 0.2s ease;
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
          flex-shrink: 0;
        `;

        if (logoUrl) {
          // Start with loading state
          logoEl.style.cssText = `
            ${baseStyles}
            background: linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 50%, #f0f0f0 100%);
            background-size: 200% 200%;
            animation: shimmer 1.5s ease-in-out infinite;
          `;

          // Add shimmer animation if not already in document
          if (!document.getElementById('marker-shimmer-style')) {
            const style = document.createElement('style');
            style.id = 'marker-shimmer-style';
            style.textContent = `
              @keyframes shimmer {
                0% { background-position: 200% 200%; }
                100% { background-position: -200% -200%; }
              }
            `;
            document.head.appendChild(style);
          }

          // Preload image and swap when ready
          const img = new Image();
          img.onload = () => {
            logoEl.style.backgroundImage = `url(${logoUrl})`;
            logoEl.style.backgroundSize = 'cover';
            logoEl.style.backgroundPosition = 'center';
            logoEl.style.backgroundColor = 'white';
            logoEl.style.background = `url(${logoUrl}) center/cover white`;
            logoEl.style.animation = 'none';
          };
          img.src = logoUrl;
        } else {
          logoEl.innerHTML = '☕';
          logoEl.style.cssText = `
            ${baseStyles}
            background: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
          `;
        }

        // Create text label
        const textLabel = document.createElement('div');
        const brandName = shop.brand?.name || shop.name;
        const locationName = shop.location?.name || '';
        textLabel.textContent = `${brandName} · ${locationName}`;
        textLabel.style.cssText = `
          background: white;
          color: #1a1a1a;
          font-size: 11px;
          font-weight: 500;
          padding: 3px 8px;
          border-radius: 10px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.15);
          margin-top: 4px;
          max-width: 80px;
          text-align: center;
          line-height: 1.3;
        `;

        container.appendChild(logoEl);
        container.appendChild(textLabel);

        if (isSelected) {
          container.style.transform = 'scale(1.1)';
        }

        // Fade in after a brief delay if fadeIn is true
        if (fadeIn) {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              container.style.opacity = '1';
            });
          });
        }

        return container;
      }
    },
    []
  );

  // Update marker element styling without replacing it
  const updateMarkerStyle = useCallback((el: HTMLElement, isSelected: boolean, shop?: Shop) => {
    // Check if it's a container with children (logo + text label) or a simple marker
    const hasChildren = el.children.length > 0;
    // Simple markers have border-radius: 50% and no children
    const isSimpleMarker = !hasChildren && el.style.borderRadius === '50%';

    if (isSimpleMarker) {
      // Simple circular marker
      const countryColor = shop?.location?.country?.primaryColor ||
                          shop?.city_area?.location?.country?.primaryColor ||
                          '#FF6B6B';
      el.style.backgroundColor = isSelected ? '#8B6F47' : countryColor;
      el.style.transform = isSelected ? 'translate3d(0, 0, 0) scale(1.3)' : 'translate3d(0, 0, 0) scale(1)';
    } else if (hasChildren) {
      // Container with logo and text label
      const logoEl = el.children[0] as HTMLElement;
      if (logoEl) {
        logoEl.style.borderColor = isSelected ? '#8B6F47' : 'white';
      }
      el.style.transform = isSelected ? 'scale(1.1)' : 'scale(1)';
    } else {
      // Legacy single element logo marker
      el.style.borderColor = isSelected ? '#8B6F47' : 'white';
      el.style.transform = isSelected ? 'translate3d(0, 0, 0) scale(1.15)' : 'translate3d(0, 0, 0) scale(1)';
    }

    el.style.zIndex = isSelected ? '10' : '1';
    el.className = `shop-marker${isSelected ? ' selected' : ''}`;
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Set token lazily to avoid module-level side effects (breaks HMR)
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center,
      zoom,
      attributionControl: false,
    });

    // Add padding to account for floating sidebar on the left
    // This shifts the visual center to account for the 360px sidebar + 20px margin
    map.current.setPadding({ left: 200, right: 0, top: 0, bottom: 0 });

    map.current.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      'top-right'
    );

    map.current.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      'bottom-right'
    );

    // Handle browser zoom changes to keep markers positioned correctly
    let lastZoom = window.devicePixelRatio;
    const checkBrowserZoom = () => {
      const currentZoom = window.devicePixelRatio;
      if (Math.abs(currentZoom - lastZoom) > 0.01) {
        lastZoom = currentZoom;
        // Force map to recalculate marker positions
        map.current?.resize();
      }
    };

    // Check for zoom changes periodically
    const zoomCheckInterval = setInterval(checkBrowserZoom, 300);

    // Track zoom changes
    map.current.on('zoom', () => {
      const newZoom = map.current?.getZoom() || zoom;
      setCurrentZoom(newZoom);
    });

    // When map loads, mark it ready for clustering and hide spinner
    // Check if already loaded (in case we missed the event)
    if (map.current.isStyleLoaded()) {
      setMapReady(true);
      setCountryLayerReady(true);
    } else {
      map.current.on('load', () => {
        setMapReady(true);
        // Give country layer setup a chance to run first, then ensure spinner hides
        setTimeout(() => {
          setCountryLayerReady(true);
        }, 500);
      });
    }

    return () => {
      clearInterval(zoomCheckInterval);
      setMapReady(false);
      map.current?.remove();
      map.current = null;
    };
  }, [zoom]);

  // Setup country boundaries highlighting
  // IMPORTANT: This effect depends on mapReady to ensure it runs AFTER the map is initialized
  useEffect(() => {
    if (!map.current || !mapReady) return;

    // If no countries provided, still mark as ready so spinner hides
    if (countries.length === 0) {
      setCountryLayerReady(true);
      return;
    }

    const m = map.current;
    let isSetup = false;

    const cleanupCountryLayer = () => {
      // Check if map still exists before trying to clean up
      if (!m || !m.getStyle()) return;

      if (m.getLayer('country-fills')) {
        m.removeLayer('country-fills');
      }
      if (m.getSource('country-fills')) {
        m.removeSource('country-fills');
      }
    };

    const setupCountryHighlighting = () => {
      if (isSetup) return; // Prevent double setup
      isSetup = true;

      // Remove existing layer and source if they exist
      cleanupCountryLayer();

      // Create a mapping of country codes to supported status
      // A country is supported if:
      // 1. It's explicitly marked as supported in the database, OR
      // 2. It has shops (auto-detect based on shop data)
      const countriesWithShops = new Set(
        displayedShops
          .map(shop => shop.location?.country?.code || shop.country?.code)
          .filter(Boolean)
      );

      const supportedCountries = countries
        .filter(c => c.supported || countriesWithShops.has(c.code))
        .map(c => c.code);

      // Add source first
      m.addSource('country-fills', {
        type: 'vector',
        url: 'mapbox://mapbox.country-boundaries-v1',
      });

      // Add country boundary fill layer - darken unsupported countries
      m.addLayer(
        {
          id: 'country-fills',
          type: 'fill',
          source: 'country-fills',
          'source-layer': 'country_boundaries',
          paint: {
            'fill-color': [
              'match',
              ['get', 'iso_3166_1'],
              supportedCountries,
              'transparent', // Supported countries - no overlay
              '#1a1a1a', // Unsupported countries - dark overlay
            ],
            'fill-opacity': [
              'match',
              ['get', 'iso_3166_1'],
              supportedCountries,
              0, // Supported countries - no opacity
              0.5, // Unsupported countries - strong dark overlay
            ],
          },
        },
        // Insert below the first symbol layer to keep country names visible
        m.getStyle().layers.find(layer => layer.type === 'symbol')?.id
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
          m.getCanvas().style.cursor = 'pointer';
        }
      };

      const handleMouseLeave = () => {
        m.getCanvas().style.cursor = '';
      };

      m.on('click', 'country-fills', handleClick);
      m.on('mouseenter', 'country-fills', handleMouseEnter);
      m.on('mouseleave', 'country-fills', handleMouseLeave);

      // Mark country layer as ready
      setCountryLayerReady(true);
    };

    if (m.isStyleLoaded()) {
      setupCountryHighlighting();
    } else {
      const onLoad = () => {
        setupCountryHighlighting();
        m.off('load', onLoad);
      };
      m.on('load', onLoad);
    }

    return () => {
      cleanupCountryLayer();
    };
  }, [countries, onUnsupportedCountryClick, displayedShops, mapReady]);

  // Update center when it changes
  useEffect(() => {
    if (!map.current) return;

    if (isLoading) {
      // Store pending updates during loading
      pendingCenter.current = center;
      pendingZoom.current = zoom;
    } else {
      // Always use smooth flyTo - no jarring fade transitions
      map.current.flyTo({
        center,
        zoom,
        duration: 1000,
        padding: { left: 200, right: 0, top: 0, bottom: 0 }
      });
      lastCenter.current = center;

      pendingCenter.current = null;
      pendingZoom.current = null;
    }
  }, [center, zoom, isLoading]);

  // Apply pending updates when loading completes
  useEffect(() => {
    if (!map.current || isLoading) return;

    if (pendingCenter.current && pendingZoom.current) {
      // Always use smooth flyTo
      map.current.flyTo({
        center: pendingCenter.current,
        zoom: pendingZoom.current,
        duration: 1000,
        padding: { left: 200, right: 0, top: 0, bottom: 0 }
      });
      lastCenter.current = pendingCenter.current;

      pendingCenter.current = null;
      pendingZoom.current = null;
    }
  }, [isLoading]);

  // Setup clustering source and layers
  // IMPORTANT: This effect depends on mapReady to ensure it runs AFTER the map is initialized
  // Do not remove mapReady from dependencies - it prevents a race condition where
  // clustering setup runs before the map exists
  useEffect(() => {
    if (!map.current || !mapReady) return;

    const setupClustering = () => {
      const m = map.current!;

      // Remove existing source and layers if they exist
      if (m.getLayer('cluster-count')) m.removeLayer('cluster-count');
      if (m.getLayer('unclustered-point')) m.removeLayer('unclustered-point');
      if (m.getLayer('clusters')) m.removeLayer('clusters');
      if (m.getSource('shops')) m.removeSource('shops');

      // Clear existing markers
      markers.current.forEach((marker) => marker.remove());
      markers.current.clear();

      // Create GeoJSON from displayed shops with country color
      const features: GeoJSON.Feature[] = [];
      displayedShops.forEach((shop) => {
        const coords = getShopCoords(shop);
        if (!coords) return;

        const countryColor = shop.location?.country?.primaryColor ||
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

      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features,
      };

      // Add clustered source with industry-standard configuration
      m.addSource('shops', {
        type: 'geojson',
        data: geojson,
        cluster: true,
        clusterRadius: CLUSTER_RADIUS, // 50px - optimal for dense urban areas
        clusterMaxZoom: CLUSTER_MAX_ZOOM, // Cluster until zoom 14 (street level)
        clusterProperties: {
          // Aggregate the dominant country color for the cluster
          clusterColor: ['coalesce', ['get', 'countryColor'], '#8B6F47']
        }
      });

      // Add cluster circle layer with dynamic country colors and zoom-based sizing
      m.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'shops',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'coalesce',
            ['get', 'clusterColor'],
            '#8B6F47'
          ],
          // Dynamic radius based on both zoom and point count
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            // At world view (zoom 0-4): tiny, discrete dots - just hint at presence
            0, 5,   // Very tiny dots at world view
            3, 7,   // Still very small
            4, 9,   // Gradually increase
            // At country/region view (zoom 5-8): start showing variation
            5, [
              'step',
              ['get', 'point_count'],
              14,
              10, 20,
              50, 26,
              100, 32,
            ],
            // At city view (zoom 9-11): medium clusters
            9, [
              'step',
              ['get', 'point_count'],
              18,
              10, 24,
              30, 30,
              50, 36,
            ],
            // Gradually shrink clusters as we approach marker handoff
            12, [
              'step',
              ['get', 'point_count'],
              14,
              5, 18,
              10, 22,
              20, 26,
            ],
            // Smooth transition to markers - clusters shrink
            13, [
              'step',
              ['get', 'point_count'],
              10,
              3, 14,
              5, 16,
              10, 18,
            ],
            // Stay visible at transition point (overlap with markers)
            14, [
              'step',
              ['get', 'point_count'],
              8,
              3, 10,
              5, 12,
              10, 14,
            ],
            // Fully hand off to individual markers
            15, 0,
          ],
          'circle-stroke-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 1.5,  // Very thin stroke at world view
            4, 2,    // Thin stroke
            5, 3,    // Normal stroke when zoomed in
            12, 2.5, // Maintain stroke
            14, 1.5, // Stay visible
            15, 0,   // No stroke at handoff
          ],
          'circle-stroke-color': '#fff',
          'circle-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 0.75,   // More subtle at world view
            4, 0.85,   // Gradually increase
            5, 0.9,    // More prominent when zoomed in
            11, 0.9,   // Maintain visibility
            13, 0.85,  // Slight fade
            14, 0.5,   // Overlap with markers
            15, 0,     // Fully hidden - markers take over
          ],
          'circle-color-transition': { duration: 0 },
          'circle-radius-transition': { duration: 0 },
          'circle-stroke-width-transition': { duration: 0 },
        },
      });

      // Add unclustered points (single shops) as simple circles
      // These show at all zoom levels until custom markers take over at zoom 14+
      m.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'shops',
        filter: ['!', ['has', 'point_count']], // Only non-clustered points
        paint: {
          'circle-color': [
            'coalesce',
            ['get', 'countryColor'],
            '#8B6F47'
          ],
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 5,    // Same size as small clusters at world view
            3, 7,
            4, 9,
            5, 11,   // Visible but modest
            9, 14,
            12, 16,  // Match cluster sizing
            14, 16,  // Stay visible at transition point
            15, 0,   // Hide after markers are fully visible
          ],
          'circle-stroke-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 1.5,
            5, 2.5,
            12, 2.5,
            14, 2.5, // Stay visible
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
            14, 0.7, // Still visible at transition - overlap with markers
            15, 0,   // Fade out after markers are established
          ],
        },
      });

      // Add cluster count label with dynamic sizing
      m.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'shops',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Offc Pro Bold', 'Arial Unicode MS Bold'],
          // Dynamic text sizing - hide at world view, show when zoomed in
          'text-size': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 0,    // Hidden at world view - too cluttered
            4, 0,    // Hidden until zoom 5
            5, 12,   // Start showing text at country view
            8, 14,   // Peak size
            11, 13,  // Maintain readability
            12, 12,  // Still visible
            13, 10,  // Shrink as markers appear
            14, 8,   // Smaller but visible
            15, 0,   // Hidden - markers take over
          ],
        },
        paint: {
          'text-color': '#ffffff',
          'text-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 0,    // Hidden at world view
            4, 0,    // Hidden until zoom 5
            5, 1,    // Fully visible at country view
            11, 1,   // Maintain visibility
            13, 0.9, // Slight fade
            14, 0.5, // Fading as markers appear
            15, 0,   // Hidden - markers take over
          ],
        },
      });

      // Click on cluster to zoom in
      m.on('click', 'clusters', (e) => {
        const features = m.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        if (!features.length) return;

        const clusterId = features[0].properties?.cluster_id;
        const source = m.getSource('shops') as mapboxgl.GeoJSONSource;
        const geometry = features[0].geometry as GeoJSON.Point;

        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) {
            console.error('Error expanding cluster:', err);
            return;
          }
          m.flyTo({
            center: geometry.coordinates as [number, number],
            zoom: zoom ?? 14,
            duration: 500,
            padding: { left: 200, right: 0, top: 0, bottom: 0 }
          });
        });
      });

      // Change cursor on cluster hover
      m.on('mouseenter', 'clusters', () => {
        m.getCanvas().style.cursor = 'pointer';
      });
      m.on('mouseleave', 'clusters', () => {
        m.getCanvas().style.cursor = '';
      });

      // Click on unclustered point to select the shop
      m.on('click', 'unclustered-point', (e) => {
        const features = m.queryRenderedFeatures(e.point, { layers: ['unclustered-point'] });
        if (!features.length) return;

        const shopId = features[0].properties?.id;
        const shop = displayedShops.find(s => s.documentId === shopId);
        if (shop) {
          onShopSelectRef.current(shop);
          // Zoom in to show the detailed marker
          const geometry = features[0].geometry as GeoJSON.Point;
          m.flyTo({
            center: geometry.coordinates as [number, number],
            zoom: 15, // Zoom past threshold to show detailed marker
            duration: 800,
            padding: { left: 200, right: 0, top: 0, bottom: 0 }
          });
        }
      });

      // Change cursor on unclustered point hover
      m.on('mouseenter', 'unclustered-point', () => {
        m.getCanvas().style.cursor = 'pointer';
      });
      m.on('mouseleave', 'unclustered-point', () => {
        m.getCanvas().style.cursor = '';
      });

      // Show markers when zoomed past cluster threshold
      // Use >= to ensure no gap between clusters disappearing and markers appearing
      const updateMarkerVisibility = () => {
        const currentMapZoom = m.getZoom();
        // Show markers at or above the cluster max zoom (clusters stop at 14, so show markers at 14+)
        const showMarkers = currentMapZoom >= CLUSTER_MAX_ZOOM;

        markers.current.forEach((marker) => {
          const el = marker.getElement();
          if (showMarkers) {
            el.style.display = '';
            el.style.opacity = '1';
            el.style.pointerEvents = '';
          } else {
            // Hide when clusters are active (below zoom 14)
            el.style.display = 'none';
            el.style.opacity = '0';
            el.style.pointerEvents = 'none';
          }
        });
      };

      // Create all markers upfront
      const createAllMarkers = () => {
        const m = map.current;
        if (!m) return;

        const mapZoom = m.getZoom();

        displayedShops.forEach((shop) => {
          const id = shop.documentId;
          const coords = getShopCoords(shop);
          if (!coords) return;

          // Skip if marker already exists
          if (markers.current.has(id)) return;

          const isSelected = id === selectedMarkerRef.current;
          const density = calculateLocalDensity(shop, displayedShops);
          const el = createMarkerElement(shop, isSelected, false, density, mapZoom);

          // Start markers hidden - updateMarkerVisibility will show them at the right time
          el.style.display = 'none';
          el.style.opacity = '0';

          const marker = new mapboxgl.Marker({
            element: el,
            anchor: 'center',
          })
            .setLngLat(coords)
            .addTo(m);

          el.addEventListener('click', (e) => {
            e.stopPropagation();
            onShopSelectRef.current(shop);
          });

          markers.current.set(id, marker);
        });
      };

      // Event handlers - simplified, just track state
      const handleDragStart = () => {
        isDragging.current = true;
      };

      const handleDragEnd = () => {
        isDragging.current = false;
      };

      const handleZoomStart = () => {
        isZooming.current = true;
      };

      const handleZoomEnd = () => {
        isZooming.current = false;
        updateMarkerVisibility();
      };

      const handleSourceData = (e: mapboxgl.MapSourceDataEvent) => {
        if (e.sourceId === 'shops' && e.isSourceLoaded) {
          updateMarkerVisibility();
        }
      };

      const handleIdle = () => {
        if (!isZooming.current && !isDragging.current) {
          updateMarkerVisibility();

          if (isTransitioning.current && !hasCalledTransitionComplete.current && onTransitionCompleteRef.current) {
            hasCalledTransitionComplete.current = true;
            isTransitioning.current = false;
            setTimeout(() => {
              onTransitionCompleteRef.current?.();
            }, 100);
          }
        }
      };

      // Add event listeners
      m.on('dragstart', handleDragStart);
      m.on('dragend', handleDragEnd);
      m.on('zoomstart', handleZoomStart);
      m.on('zoomend', handleZoomEnd);
      m.on('sourcedata', handleSourceData);
      m.on('idle', handleIdle);

      // Create all markers and update visibility based on zoom
      createAllMarkers();
      updateMarkerVisibility();

      // Force map resize to ensure markers render correctly
      m.resize();

      // Also update marker visibility after a short delay (fixes timing issues)
      const ensureMarkersTimeout = setTimeout(() => {
        updateMarkerVisibility();
        m.resize();
      }, 100);

      // Cleanup function - remove event listeners when effect re-runs
      return () => {
        clearTimeout(ensureMarkersTimeout);
        m.off('dragstart', handleDragStart);
        m.off('dragend', handleDragEnd);
        m.off('zoomstart', handleZoomStart);
        m.off('zoomend', handleZoomEnd);
        m.off('sourcedata', handleSourceData);
        m.off('idle', handleIdle);
      };
    };

    // Since we wait for mapReady (which is set when map loads), style should be loaded
    // Run setupClustering directly
    const cleanup = setupClustering();

    return () => {
      cleanup?.();
    };
  }, [displayedShops, createMarkerElement, mapReady]);

  // Store callbacks in refs to avoid re-running setup when they change
  const onShopSelectRef = useRef(onShopSelect);
  const onTransitionCompleteRef = useRef(onTransitionComplete);

  useEffect(() => {
    onShopSelectRef.current = onShopSelect;
    onTransitionCompleteRef.current = onTransitionComplete;
  }, [onShopSelect, onTransitionComplete]);

  // Recreate markers when crossing zoom thresholds for size/style changes
  useEffect(() => {
    if (!map.current || displayedShops.length === 0 || markers.current.size === 0) return;

    // Use imported getZoomBracket from mapGeometry
    const currentBracket = getZoomBracket(currentZoom);
    const previousBracket = wasAboveZoomThreshold.current as unknown as number;

    // Only recreate if we crossed a threshold bracket
    if (previousBracket !== currentBracket) {
      (wasAboveZoomThreshold as any).current = currentBracket;

      const m = map.current;
      const source = m.getSource('shops') as mapboxgl.GeoJSONSource;
      if (!source) return;

      // Clear and recreate all markers with new zoom level
      markers.current.forEach((marker) => marker.remove());
      markers.current.clear();

      displayedShops.forEach((shop) => {
        const id = shop.documentId;
        const coords = getShopCoords(shop);
        if (!coords) return;

        const isSelected = id === selectedMarkerRef.current;
        const density = calculateLocalDensity(shop, displayedShops);
        const el = createMarkerElement(shop, isSelected, false, density, currentZoom);

        // Start markers hidden
        el.style.display = 'none';
        el.style.opacity = '0';

        const marker = new mapboxgl.Marker({
          element: el,
          anchor: 'center',
        })
          .setLngLat(coords)
          .addTo(m);

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onShopSelectRef.current(shop);
        });

        markers.current.set(id, marker);
      });

      // Clean cutoff - only show markers after clusters are gone
      const showMarkers = currentZoom > CLUSTER_MAX_ZOOM;

      markers.current.forEach((marker) => {
        const el = marker.getElement();
        if (showMarkers) {
          el.style.display = '';
          el.style.opacity = '1';
          el.style.pointerEvents = '';
        } else {
          el.style.display = 'none';
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
        }
      });
    }
  }, [currentZoom, displayedShops, createMarkerElement]);

  // Update selected marker styling
  useEffect(() => {
    if (!map.current) return;

    // Reset previous selected marker
    if (selectedMarkerRef.current && markers.current.has(selectedMarkerRef.current)) {
      const marker = markers.current.get(selectedMarkerRef.current);
      const prevShop = displayedShops.find(s => s.documentId === selectedMarkerRef.current);
      if (marker) {
        updateMarkerStyle(marker.getElement(), false, prevShop);
      }
    }

    // Style new selected marker
    if (selectedShop && markers.current.has(selectedShop.documentId)) {
      const marker = markers.current.get(selectedShop.documentId);
      if (marker) {
        updateMarkerStyle(marker.getElement(), true, selectedShop);

        // Fly to selected shop
        const coords = getShopCoords(selectedShop);
        if (coords) {
          map.current?.flyTo({
            center: coords,
            zoom: Math.max(map.current?.getZoom() || 14, 14),
            duration: 800,
            padding: { left: 200, right: 0, top: 0, bottom: 0 }
          });
        }
      }
    }

    selectedMarkerRef.current = selectedShop?.documentId || null;
  }, [selectedShop, updateMarkerStyle, displayedShops]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="map-container" />

      {/* Country layer loading overlay - prevents flash of unstyled map */}
      <div
        className={`absolute inset-0 bg-white flex items-center justify-center pointer-events-none z-[5] transition-opacity duration-300 ${
          countryLayerReady ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <Spinner size="lg" color="primary" />
      </div>

      {/* Loading spinner overlay */}
      <div
        className={`absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center pointer-events-none z-10 transition-opacity duration-500 ease-in-out ${
          isLoading ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <Spinner size="lg" color="primary" />
      </div>
    </div>
  );
}
