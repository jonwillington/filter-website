'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { Spinner } from '@heroui/react';
import { Shop, Country } from '@/lib/types';
import { getMediaUrl } from '@/lib/utils';

if (typeof window !== 'undefined') {
  mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
}

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
  const [isFading, setIsFading] = useState(false);
  const lastCenter = useRef<[number, number]>(center);
  const [currentZoom, setCurrentZoom] = useState(zoom);
  // Track zoom bracket for marker size updates (0-5 based on thresholds: 3, 5, 7, 10, 13)
  const getInitialZoomBracket = (z: number) => {
    const thresholds = [3, 5, 7, 10, 13];
    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (z >= thresholds[i]) return i + 1;
    }
    return 0;
  };
  const wasAboveZoomThreshold = useRef(getInitialZoomBracket(zoom));

  // Keep shopsRef in sync
  useEffect(() => {
    shopsRef.current = shops;
  }, [shops]);

  // Calculate distance between two coordinates (in degrees, approximate)
  const calculateDistance = useCallback((point1: [number, number], point2: [number, number]): number => {
    const [lng1, lat1] = point1;
    const [lng2, lat2] = point2;

    // Haversine formula for great circle distance
    const toRad = (deg: number) => deg * Math.PI / 180;
    const R = 6371; // Earth's radius in km

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km

    return distance;
  }, []);

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

  // Helper to get coordinates
  const getCoords = useCallback((shop: Shop): [number, number] | null => {
    if (shop.coordinates?.lng && shop.coordinates?.lat) {
      return [shop.coordinates.lng, shop.coordinates.lat];
    }
    if (shop.longitude && shop.latitude) {
      return [shop.longitude, shop.latitude];
    }
    return null;
  }, []);

  // Calculate local density for a shop (how many shops are nearby)
  const calculateLocalDensity = useCallback((shop: Shop, allShops: Shop[]): number => {
    const coords = getCoords(shop);
    if (!coords) return 0;

    const [lng, lat] = coords;
    const DENSITY_RADIUS_KM = 1.5; // Smaller radius (1.5km) for more localized density check

    let nearbyCount = 0;
    allShops.forEach((otherShop) => {
      if (otherShop.documentId === shop.documentId) return;

      const otherCoords = getCoords(otherShop);
      if (!otherCoords) return;

      const distance = calculateDistance(coords, otherCoords);
      if (distance <= DENSITY_RADIUS_KM) {
        nearbyCount++;
      }
    });

    return nearbyCount;
  }, [getCoords, calculateDistance]);

  // Create marker element
  const createMarkerElement = useCallback(
    (shop: Shop, isSelected: boolean, fadeIn: boolean = false, density: number = 0, zoomLevel: number = 12) => {
      // Density threshold - use simple markers when there are many nearby shops
      // Higher threshold (30) means logos appear in moderately dense areas too
      const HIGH_DENSITY_THRESHOLD = 30;
      const ZOOM_THRESHOLD = 13; // Below this zoom, always use simple markers
      const LOGO_ZOOM_THRESHOLD = 15; // Above this zoom, show logos even in high density areas

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
          white-space: nowrap;
          box-shadow: 0 2px 4px rgba(0,0,0,0.15);
          margin-top: 4px;
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
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

    return () => {
      clearInterval(zoomCheckInterval);
      map.current?.remove();
      map.current = null;
    };
  }, [zoom]);

  // Setup country boundaries highlighting
  useEffect(() => {
    if (!map.current || countries.length === 0) return;

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
      const supportedCountries = countries
        .filter(c => c.supported)
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
        // Don't show modal if:
        // 1. Country is in supported list, OR
        // 2. We have shops (using ref for current value), OR
        // 3. There are shops in this country
        const hasShops = shopsRef.current.length > 0;
        const hasShopsInCountry = shopsRef.current.some(shop =>
          shop.location?.country?.code === countryCode ||
          shop.country?.code === countryCode
        );

        if (countryCode && !supportedCountries.includes(countryCode) && !hasShops && !hasShopsInCountry) {
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
  }, [countries, onUnsupportedCountryClick]);

  // Update center when it changes
  useEffect(() => {
    if (!map.current) return;

    if (isLoading) {
      // Store pending updates during loading
      pendingCenter.current = center;
      pendingZoom.current = zoom;
    } else {
      // Calculate distance from last position
      const distance = calculateDistance(lastCenter.current, center);
      const DISTANCE_THRESHOLD = 300; // 300km threshold for fade transition

      if (distance > DISTANCE_THRESHOLD) {
        // Use elegant fade transition for far distances
        setIsFading(true);

        setTimeout(() => {
          // Jump to new position while fully faded
          map.current?.jumpTo({
            center,
            zoom,
            padding: { left: 200, right: 0, top: 0, bottom: 0 }
          });
          lastCenter.current = center;

          // Hold the fade for a moment before fading back in
          setTimeout(() => {
            setIsFading(false);
          }, 100);
        }, 250); // Quick fade out
      } else {
        // Use smooth flyTo for nearby locations
        map.current.flyTo({
          center,
          zoom,
          duration: 800,
          padding: { left: 200, right: 0, top: 0, bottom: 0 }
        });
        lastCenter.current = center;
      }

      pendingCenter.current = null;
      pendingZoom.current = null;
    }
  }, [center, zoom, isLoading, calculateDistance]);

  // Apply pending updates when loading completes
  useEffect(() => {
    if (!map.current || isLoading) return;

    if (pendingCenter.current && pendingZoom.current) {
      const distance = calculateDistance(lastCenter.current, pendingCenter.current);
      const DISTANCE_THRESHOLD = 300; // 300km threshold for fade transition

      if (distance > DISTANCE_THRESHOLD) {
        // Use elegant fade transition for far distances
        setIsFading(true);

        setTimeout(() => {
          map.current?.jumpTo({
            center: pendingCenter.current!,
            zoom: pendingZoom.current!,
            padding: { left: 200, right: 0, top: 0, bottom: 0 }
          });
          lastCenter.current = pendingCenter.current!;

          // Hold the fade for a moment before fading back in
          setTimeout(() => {
            setIsFading(false);
          }, 100);
        }, 250);
      } else {
        // Use smooth flyTo for nearby locations
        map.current.flyTo({
          center: pendingCenter.current,
          zoom: pendingZoom.current,
          duration: 800,
          padding: { left: 200, right: 0, top: 0, bottom: 0 }
        });
        lastCenter.current = pendingCenter.current;
      }

      pendingCenter.current = null;
      pendingZoom.current = null;
    }
  }, [isLoading, calculateDistance]);

  // Setup clustering source and layers
  useEffect(() => {
    if (!map.current) {
      return;
    }

    const setupClustering = () => {
      const m = map.current!;
      const mapZoom = m.getZoom();

      // Remove existing source and layers if they exist
      if (m.getLayer('cluster-count')) m.removeLayer('cluster-count');
      if (m.getLayer('clusters')) m.removeLayer('clusters');
      if (m.getSource('shops')) m.removeSource('shops');

      // Clear existing markers
      markers.current.forEach((marker) => marker.remove());
      markers.current.clear();

      // Create GeoJSON from displayed shops with country color
      const features: GeoJSON.Feature[] = [];
      displayedShops.forEach((shop) => {
        const coords = getCoords(shop);
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
            // Smooth transition to markers - clusters fade out
            13, [
              'step',
              ['get', 'point_count'],
              10,
              3, 14,
              5, 16,
              10, 18,
            ],
            // Fully hand off to individual markers
            14, 0,
          ],
          'circle-stroke-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 1.5,  // Very thin stroke at world view
            4, 2,    // Thin stroke
            5, 3,    // Normal stroke when zoomed in
            12, 2.5, // Maintain stroke
            13, 1.5, // Start reducing
            14, 0,   // No stroke at handoff
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
            12, 0.85,  // Slight fade
            13, 0.5,   // Start fading as markers appear
            14, 0,     // Fully hidden - markers take over
          ],
          'circle-color-transition': { duration: 0 },
          'circle-radius-transition': { duration: 0 },
          'circle-stroke-width-transition': { duration: 0 },
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
            14, 0,   // Hidden - markers take over
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
            12, 0.9, // Slight fade
            13, 0.5, // Fading as markers appear
            14, 0,   // Hidden - markers take over
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

      // Clean cutoff - no overlap between clusters and markers
      // Show markers ONLY when clusters are completely hidden
      const updateMarkerVisibility = () => {
        const currentMapZoom = m.getZoom();
        // Only show markers after clusters are fully gone
        const showMarkers = currentMapZoom > CLUSTER_MAX_ZOOM;

        markers.current.forEach((marker) => {
          const el = marker.getElement();
          if (showMarkers) {
            el.style.display = '';
            el.style.opacity = '1';
            el.style.pointerEvents = '';
          } else {
            // Completely hide when clusters are active
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
          const coords = getCoords(shop);
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

    let cleanup: (() => void) | undefined;

    if (map.current.isStyleLoaded()) {
      cleanup = setupClustering();
    } else {
      const onLoad = () => {
        cleanup = setupClustering();
      };
      map.current.on('load', onLoad);
      return () => {
        map.current?.off('load', onLoad);
        cleanup?.();
      };
    }

    return () => {
      cleanup?.();
    };
  }, [displayedShops, getCoords, createMarkerElement]);

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

    // Define zoom thresholds that affect marker appearance
    const ZOOM_THRESHOLDS = [3, 5, 7, 10, 13];

    // Determine which threshold bracket the current zoom is in
    const getZoomBracket = (zoom: number) => {
      for (let i = ZOOM_THRESHOLDS.length - 1; i >= 0; i--) {
        if (zoom >= ZOOM_THRESHOLDS[i]) return i + 1;
      }
      return 0;
    };

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
        const coords = getCoords(shop);
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
  }, [currentZoom, displayedShops, getCoords, createMarkerElement, calculateLocalDensity]);

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
        const coords = getCoords(selectedShop);
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
  }, [selectedShop, updateMarkerStyle, getCoords]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="map-container" />
      {/* Loading spinner overlay */}
      <div
        className={`absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center pointer-events-none z-10 transition-opacity duration-500 ease-in-out ${
          isLoading ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <Spinner size="lg" color="primary" />
      </div>
      {/* Fade transition overlay for distant locations */}
      <div
        className={`absolute inset-0 bg-white pointer-events-none z-20 transition-opacity duration-300 ease-in-out ${
          isFading ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
