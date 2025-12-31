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

const CLUSTER_RADIUS = 30;
const CLUSTER_MAX_ZOOM = 11;

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

  // Keep shopsRef in sync
  useEffect(() => {
    shopsRef.current = shops;
  }, [shops]);

  // Update displayed shops only when not loading
  useEffect(() => {
    if (!isLoading) {
      setDisplayedShops(shops);
    }
  }, [shops, isLoading]);

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

  // Create marker element
  const createMarkerElement = useCallback(
    (shop: Shop, isSelected: boolean, fadeIn: boolean = false) => {
      const el = document.createElement('div');
      el.className = `shop-marker${isSelected ? ' selected' : ''}`;

      const logoUrl = getMediaUrl(shop.brand?.logo);
      const baseStyles = `
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 3px solid ${isSelected ? '#8B6F47' : 'white'};
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        cursor: pointer;
        transition: transform 0.15s ease, border-color 0.15s ease, opacity 0.2s ease;
        opacity: ${fadeIn ? '0' : '1'};
        will-change: transform, opacity;
        transform-origin: center center;
        position: absolute;
        backface-visibility: hidden;
        transform: translate3d(0, 0, 0);
        contain: layout style paint;
        image-rendering: -webkit-optimize-contrast;
        image-rendering: crisp-edges;
      `;

      if (logoUrl) {
        // Start with loading state - subtle pulsing background
        el.style.cssText = `
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
          el.style.backgroundImage = `url(${logoUrl})`;
          el.style.backgroundSize = 'cover';
          el.style.backgroundPosition = 'center';
          el.style.backgroundColor = 'white';
          el.style.background = `url(${logoUrl}) center/cover white`;
          el.style.animation = 'none';
        };
        img.src = logoUrl;
      } else {
        el.innerHTML = '☕';
        el.style.cssText = `
          ${baseStyles}
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        `;
      }

      if (isSelected) {
        el.style.transform = 'translate3d(0, 0, 0) scale(1.1)';
        el.style.zIndex = '10';
      }

      // Fade in after a brief delay if fadeIn is true
      if (fadeIn) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            el.style.opacity = '1';
          });
        });
      }

      return el;
    },
    []
  );

  // Update marker element styling without replacing it
  const updateMarkerStyle = useCallback((el: HTMLElement, isSelected: boolean) => {
    el.style.borderColor = isSelected ? '#8B6F47' : 'white';
    el.style.transform = isSelected ? 'translate3d(0, 0, 0) scale(1.1)' : 'translate3d(0, 0, 0) scale(1)';
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

    return () => {
      clearInterval(zoomCheckInterval);
      map.current?.remove();
      map.current = null;
    };
  }, []);

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
      // Apply updates when not loading
      map.current.flyTo({ center, zoom, duration: 800 });
      pendingCenter.current = null;
      pendingZoom.current = null;
    }
  }, [center, zoom, isLoading]);

  // Apply pending updates when loading completes
  useEffect(() => {
    if (!map.current || isLoading) return;

    if (pendingCenter.current && pendingZoom.current) {
      map.current.flyTo({
        center: pendingCenter.current,
        zoom: pendingZoom.current,
        duration: 800
      });
      pendingCenter.current = null;
      pendingZoom.current = null;
    }
  }, [isLoading]);

  // Setup clustering source and layers
  useEffect(() => {
    if (!map.current) return;

    const setupClustering = () => {
      const m = map.current!;

      // Remove existing source and layers if they exist
      if (m.getLayer('cluster-count')) m.removeLayer('cluster-count');
      if (m.getLayer('clusters')) m.removeLayer('clusters');
      if (m.getSource('shops')) m.removeSource('shops');

      // Clear existing markers
      markers.current.forEach((marker) => marker.remove());
      markers.current.clear();

      // Create GeoJSON from displayed shops
      const features: GeoJSON.Feature[] = [];
      displayedShops.forEach((shop) => {
        const coords = getCoords(shop);
        if (!coords) return;
        features.push({
          type: 'Feature',
          properties: {
            id: shop.documentId,
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

      // Add clustered source
      m.addSource('shops', {
        type: 'geojson',
        data: geojson,
        cluster: true,
        clusterRadius: CLUSTER_RADIUS,
        clusterMaxZoom: CLUSTER_MAX_ZOOM,
      });

      // Add cluster circle layer
      m.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'shops',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#8B6F47',
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            20,  // radius for count < 10
            10, 25,  // radius for count >= 10
            30, 30,  // radius for count >= 30
          ],
          'circle-stroke-width': 3,
          'circle-stroke-color': '#fff',
          'circle-color-transition': { duration: 0 },
          'circle-radius-transition': { duration: 0 },
          'circle-stroke-width-transition': { duration: 0 },
        },
      });

      // Add cluster count label
      m.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'shops',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Offc Pro Bold', 'Arial Unicode MS Bold'],
          'text-size': 14,
        },
        paint: {
          'text-color': '#ffffff',
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

        displayedShops.forEach((shop) => {
          const id = shop.documentId;
          const coords = getCoords(shop);
          if (!coords) return;

          // Skip if marker already exists
          if (markers.current.has(id)) {
            return;
          }

          const isSelected = id === selectedMarkerRef.current;
          const el = createMarkerElement(shop, isSelected, false);

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
        // Disable position transitions on all markers during zoom for stability
        markers.current.forEach((marker) => {
          const el = marker.getElement();
          el.style.transition = 'opacity 0.2s ease';
        });
      });

      m.on('zoomend', () => {
        isZooming.current = false;
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
            el.style.transition = 'transform 0.15s ease, border-color 0.15s ease, opacity 0.2s ease';
          });

          updateMarkers(true);

          // Call transition complete callback after map is idle and transitioning
          if (isTransitioning.current && !hasCalledTransitionComplete.current && onTransitionComplete) {
            hasCalledTransitionComplete.current = true;
            isTransitioning.current = false;
            // Small delay to ensure everything is rendered
            setTimeout(() => {
              onTransitionComplete();
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

  // Update selected marker styling
  useEffect(() => {
    if (!map.current) return;

    // Reset previous selected marker
    if (selectedMarkerRef.current && markers.current.has(selectedMarkerRef.current)) {
      const marker = markers.current.get(selectedMarkerRef.current);
      if (marker) {
        updateMarkerStyle(marker.getElement(), false);
      }
    }

    // Style new selected marker
    if (selectedShop && markers.current.has(selectedShop.documentId)) {
      const marker = markers.current.get(selectedShop.documentId);
      if (marker) {
        updateMarkerStyle(marker.getElement(), true);

        // Fly to selected shop
        const coords = getCoords(selectedShop);
        if (coords) {
          map.current?.flyTo({
            center: coords,
            zoom: Math.max(map.current?.getZoom() || 14, 14),
            duration: 800,
          });
        }
      }
    }

    selectedMarkerRef.current = selectedShop?.documentId || null;
  }, [selectedShop, updateMarkerStyle, getCoords]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="map-container" />
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
