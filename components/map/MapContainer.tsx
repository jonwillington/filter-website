'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { Shop } from '@/lib/types';
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
}

const CLUSTER_RADIUS = 30;
const CLUSTER_MAX_ZOOM = 11;

export function MapContainer({
  shops,
  selectedShop,
  onShopSelect,
  center = [28.9784, 41.0082],
  zoom = 12,
  isLoading = false,
  onTransitionComplete,
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
        transition: transform 0.15s ease, border-color 0.15s ease;
        opacity: 1;
        will-change: transform;
        transform-origin: center center;
        position: absolute;
        backface-visibility: hidden;
        transform: translate3d(0, 0, 0);
        contain: layout style paint;
        image-rendering: -webkit-optimize-contrast;
        image-rendering: crisp-edges;
      `;

      if (logoUrl) {
        el.style.cssText = `
          ${baseStyles}
          background-image: url(${logoUrl});
          background-size: cover;
          background-position: center;
          background-color: white;
        `;
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

      // Function to update visible markers - now just shows/hides instead of adding/removing
      const updateMarkers = () => {
        const m = map.current;
        if (!m) return;

        const features = m.querySourceFeatures('shops');
        const visibleMarkerIds = new Set<string>();

        features.forEach((feature) => {
          // Skip clusters
          if (feature.properties?.cluster) return;

          const id = feature.properties?.id;
          if (!id) return;

          visibleMarkerIds.add(id);
        });

        // Show/hide markers based on clustering state
        markers.current.forEach((marker, id) => {
          const element = marker.getElement();
          if (visibleMarkerIds.has(id)) {
            // Show marker - it's not clustered
            element.style.display = '';
          } else {
            // Hide marker - it's clustered
            element.style.display = 'none';
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

      // Track zoom state - freeze marker updates during zoom
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
        // Don't re-enable transitions yet - map might still be animating
        // Will re-enable when map becomes idle
      });

      // Update markers when map becomes idle (completely stopped)
      m.on('idle', () => {
        if (!isZooming.current && !isDragging.current) {
          // Re-enable transitions now that map has completely stopped
          markers.current.forEach((marker) => {
            const el = marker.getElement();
            el.style.transition = 'transform 0.15s ease, border-color 0.15s ease';
          });

          updateMarkers();

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
        <div className="relative">
          {/* Spinner */}
          <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
          {/* Pulsing background circle */}
          <div className="absolute inset-0 w-12 h-12 border-4 border-accent/10 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}
