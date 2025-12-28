'use client';

import { useEffect, useRef, useCallback } from 'react';
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
}

const CLUSTER_RADIUS = 50;
const CLUSTER_MAX_ZOOM = 14;

export function MapContainer({
  shops,
  selectedShop,
  onShopSelect,
  center = [28.9784, 41.0082],
  zoom = 12,
}: MapContainerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const selectedMarkerRef = useRef<string | null>(null);
  const shopsRef = useRef<Shop[]>(shops);
  const isZooming = useRef<boolean>(false);

  // Keep shopsRef in sync
  useEffect(() => {
    shopsRef.current = shops;
  }, [shops]);

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
    (shop: Shop, isSelected: boolean) => {
      const el = document.createElement('div');
      el.className = `shop-marker${isSelected ? ' selected' : ''}`;

      const logoUrl = getMediaUrl(shop.brand?.logo);

      if (logoUrl) {
        el.style.cssText = `
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 3px solid ${isSelected ? '#8B6F47' : 'white'};
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          background-image: url(${logoUrl});
          background-size: cover;
          background-position: center;
          background-color: white;
          cursor: pointer;
          transition: transform 0.15s ease, border-color 0.15s ease;
        `;
      } else {
        el.innerHTML = '☕';
        el.style.cssText = `
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 3px solid ${isSelected ? '#8B6F47' : 'white'};
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          cursor: pointer;
          transition: transform 0.15s ease, border-color 0.15s ease;
        `;
      }

      if (isSelected) {
        el.style.transform = 'scale(1.1)';
        el.style.zIndex = '10';
      }

      return el;
    },
    []
  );

  // Update marker element styling without replacing it
  const updateMarkerStyle = useCallback((el: HTMLElement, isSelected: boolean) => {
    el.style.borderColor = isSelected ? '#8B6F47' : 'white';
    el.style.transform = isSelected ? 'scale(1.1)' : 'scale(1)';
    el.style.zIndex = isSelected ? '10' : '1';
    el.className = `shop-marker${isSelected ? ' selected' : ''}`;
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
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

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update center when it changes
  useEffect(() => {
    if (!map.current) return;
    map.current.flyTo({ center, zoom, duration: 1000 });
  }, [center, zoom]);

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

      // Create GeoJSON from shops
      const features: GeoJSON.Feature[] = [];
      shops.forEach((shop) => {
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
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
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

      // Function to update visible markers
      const updateMarkers = () => {
        const m = map.current;
        if (!m || isZooming.current) return;

        const features = m.querySourceFeatures('shops');
        const newMarkerIds = new Set<string>();

        features.forEach((feature) => {
          // Skip clusters
          if (feature.properties?.cluster) return;

          const id = feature.properties?.id;
          if (!id) return;

          // Get coordinates from the original shop data for stability
          const shop = shopsRef.current.find((s) => s.documentId === id);
          if (!shop) return;

          const coords = getCoords(shop);
          if (!coords) return;

          newMarkerIds.add(id);

          // Skip if marker already exists
          if (markers.current.has(id)) return;

          const isSelected = id === selectedMarkerRef.current;
          const el = createMarkerElement(shop, isSelected);

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

        // Remove markers that are no longer visible (clustered)
        markers.current.forEach((marker, id) => {
          if (!newMarkerIds.has(id)) {
            marker.remove();
            markers.current.delete(id);
          }
        });
      };

      // Track zoom state to prevent marker updates during animation
      m.on('zoomstart', () => {
        isZooming.current = true;
      });
      m.on('zoomend', () => {
        isZooming.current = false;
        updateMarkers();
      });

      // Update markers when map becomes idle (all animations complete)
      m.on('idle', updateMarkers);
      updateMarkers();
    };

    if (map.current.isStyleLoaded()) {
      setupClustering();
    } else {
      map.current.on('load', setupClustering);
    }
  }, [shops, getCoords, createMarkerElement, onShopSelect]);

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

  return <div ref={mapContainer} className="map-container" />;
}
