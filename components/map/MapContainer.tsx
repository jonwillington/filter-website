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

const CLUSTER_RADIUS = 50; // Larger radius for better city grouping at world view
const CLUSTER_MAX_ZOOM = 11; // Stop clustering at city view to show individual markers

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
  const wasAboveZoomThreshold = useRef(zoom >= 13);

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
    console.log('MapContainer: Updating displayedShops, count:', shops.length);
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
        el.style.cssText = `
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: ${markerColor};
          border: 2px solid white;
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
    const isSimpleMarker = el.style.width === '22px';

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
    if (!map.current) return;

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

      console.log('MapContainer: Setting up clustering with features:', features.length, 'displayedShops:', displayedShops.length);

      // Add clustered source with cluster properties for color aggregation
      m.addSource('shops', {
        type: 'geojson',
        data: geojson,
        cluster: true,
        clusterRadius: CLUSTER_RADIUS,
        clusterMaxZoom: CLUSTER_MAX_ZOOM,
        clusterProperties: {
          // Get the first shop's color for the cluster
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
            // At neighborhood view (zoom 12+): detailed clusters
            12, [
              'step',
              ['get', 'point_count'],
              15,
              5, 20,
              10, 25,
              20, 30,
            ],
          ],
          'circle-stroke-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 1.5, // Very thin stroke at world view
            4, 2,   // Thin stroke
            5, 3,   // Normal stroke when zoomed in
          ],
          'circle-stroke-color': '#fff',
          'circle-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 0.75,  // More subtle at world view
            4, 0.85,  // Gradually increase
            5, 0.9,   // More prominent when zoomed in
            12, 0.8,
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
          // Hide text at world view, show when zoomed in
          'text-size': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 0,   // Hidden at world view - too cluttered
            4, 0,   // Hidden until zoom 5
            5, 12,  // Start showing text at country view
            8, 14,
            12, 12,
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

      // Track which markers are currently visible for fade-in effect
      const visibleMarkersSet = new Set<string>();

      // Function to update visible markers - now just shows/hides instead of adding/removing
      const updateMarkers = (withFade: boolean = false) => {
        const m = map.current;
        if (!m) return;

        const features = m.querySourceFeatures('shops');
        const newVisibleMarkerIds = new Set<string>();

        features.forEach((feature) => {
          // Skip clusters
          if (feature.properties?.cluster) return;

          const id = feature.properties?.id;
          if (!id) return;

          newVisibleMarkerIds.add(id);
        });

        // Show/hide markers based on clustering state
        markers.current.forEach((marker, id) => {
          const element = marker.getElement();
          const wasVisible = visibleMarkersSet.has(id);
          const shouldBeVisible = newVisibleMarkerIds.has(id);

          if (shouldBeVisible && !wasVisible) {
            // Marker is becoming visible - fade in
            element.style.display = '';
            if (withFade) {
              element.style.opacity = '0';
              element.style.transition = 'opacity 0.2s ease';
              requestAnimationFrame(() => {
                element.style.opacity = '1';
              });
            }
            visibleMarkersSet.add(id);
          } else if (!shouldBeVisible && wasVisible) {
            // Marker is being hidden
            element.style.display = 'none';
            visibleMarkersSet.delete(id);
          } else if (shouldBeVisible) {
            // Marker stays visible
            element.style.display = '';
          }
        });
      };

      // Create all markers upfront
      const createAllMarkers = () => {
        const m = map.current;
        if (!m) return;

        const mapZoom = m.getZoom();

        console.log('MapContainer: Creating all markers, count:', displayedShops.length, 'zoom:', mapZoom);

        displayedShops.forEach((shop) => {
          const id = shop.documentId;
          const coords = getCoords(shop);
          if (!coords) return;

          // Skip if marker already exists
          if (markers.current.has(id)) {
            return;
          }

          const isSelected = id === selectedMarkerRef.current;
          const density = calculateLocalDensity(shop, displayedShops);
          const el = createMarkerElement(shop, isSelected, false, density, mapZoom);

          const marker = new mapboxgl.Marker({
            element: el,
            anchor: 'center',
          })
            .setLngLat(coords)
            .addTo(m);

          el.addEventListener('click', (e) => {
            e.stopPropagation();
            onShopSelect(shop);
          });

          markers.current.set(id, marker);
        });
      };

      // Track drag state - freeze marker updates during drag/glide
      m.on('dragstart', () => {
        isDragging.current = true;
        // Disable transitions on all markers during drag for stability
        markers.current.forEach((marker) => {
          const el = marker.getElement();
          el.style.transition = 'none';
        });
      });

      m.on('dragend', () => {
        isDragging.current = false;
        // Don't re-enable transitions yet - map might still be gliding
        // Will re-enable when map becomes idle
      });

      // Track zoom state
      m.on('zoomstart', () => {
        isZooming.current = true;
        // Disable transitions on all markers during zoom for stability
        markers.current.forEach((marker) => {
          const el = marker.getElement();
          el.style.transition = 'none';
        });
      });

      m.on('zoomend', () => {
        isZooming.current = false;
        // Re-enable transitions
        markers.current.forEach((marker) => {
          const el = marker.getElement();
          el.style.transition = 'background-color 0.2s ease, border-color 0.2s ease, opacity 0.2s ease';
        });
        // Update markers immediately when zoom ends with fade effect
        updateMarkers(true);
      });

      // Update markers during zoom for smoother cluster-to-marker transitions
      m.on('zoom', () => {
        // Only update during animated zooms (flyTo, etc)
        if (isZooming.current) {
          updateMarkers(true);
        }
      });

      // Update markers when map becomes idle (completely stopped)
      m.on('idle', () => {
        if (!isZooming.current && !isDragging.current) {
          // Re-enable transitions now that map has completely stopped
          markers.current.forEach((marker) => {
            const el = marker.getElement();
            el.style.transition = 'background-color 0.2s ease, border-color 0.2s ease, opacity 0.2s ease';
          });

          // Force marker update to ensure they're visible
          updateMarkers(true);

          // Call transition complete callback after map is idle and transitioning
          if (isTransitioning.current && !hasCalledTransitionComplete.current && onTransitionComplete) {
            hasCalledTransitionComplete.current = true;
            isTransitioning.current = false;
            // Small delay to ensure everything is rendered
            setTimeout(() => {
              onTransitionComplete();
              // Force another marker update after transition completes
              updateMarkers(false);
            }, 100);
          }
        }
      });

      // Create all markers initially, then use updateMarkers to show/hide
      createAllMarkers();
      updateMarkers();
    };

    if (map.current.isStyleLoaded()) {
      setupClustering();
    } else {
      map.current.on('load', setupClustering);
    }
  }, [displayedShops, getCoords, createMarkerElement, onShopSelect]);

  // Recreate markers when crossing zoom threshold (13) to transform simple <-> logo markers
  useEffect(() => {
    if (!map.current || displayedShops.length === 0 || markers.current.size === 0) return;

    const ZOOM_THRESHOLD = 13;
    const isAboveThreshold = currentZoom >= ZOOM_THRESHOLD;

    // Only recreate if we crossed the threshold
    if (wasAboveZoomThreshold.current !== isAboveThreshold) {
      wasAboveZoomThreshold.current = isAboveThreshold;

      const m = map.current;
      const source = m.getSource('shops') as mapboxgl.GeoJSONSource;
      if (!source) return;

      // Clear and recreate all markers with new zoom level
      markers.current.forEach((marker) => marker.remove());
      markers.current.clear();

      // Track visible markers
      const visibleMarkersSet = new Set<string>();

      displayedShops.forEach((shop) => {
        const id = shop.documentId;
        const coords = getCoords(shop);
        if (!coords) return;

        const isSelected = id === selectedMarkerRef.current;
        const density = calculateLocalDensity(shop, displayedShops);
        const el = createMarkerElement(shop, isSelected, false, density, currentZoom);

        const marker = new mapboxgl.Marker({
          element: el,
          anchor: 'center',
        })
          .setLngLat(coords)
          .addTo(m);

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onShopSelect(shop);
        });

        markers.current.set(id, marker);
      });

      // Update visibility after recreating
      const features = m.querySourceFeatures('shops');
      const visibleIds = new Set<string>();
      features.forEach((feature) => {
        if (!feature.properties?.cluster && feature.properties?.id) {
          visibleIds.add(feature.properties.id);
        }
      });

      markers.current.forEach((marker, id) => {
        const el = marker.getElement();
        el.style.display = visibleIds.has(id) ? '' : 'none';
      });
    }
  }, [currentZoom, displayedShops, getCoords, createMarkerElement, calculateLocalDensity, onShopSelect]);

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
