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

  // Create marker element
  const createMarkerElement = useCallback(
    (shop: Shop, isSelected: boolean) => {
      const el = document.createElement('div');
      el.className = `shop-marker${isSelected ? ' selected' : ''}`;

      const logoUrl = getMediaUrl(shop.brand?.logo);

      if (logoUrl) {
        el.style.cssText = `
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 3px solid ${isSelected ? '#8B6F47' : 'white'};
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          background-image: url(${logoUrl});
          background-size: cover;
          background-position: center;
          background-color: white;
          cursor: pointer;
        `;
      } else {
        el.innerHTML = '☕';
        el.style.cssText = `
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 3px solid ${isSelected ? '#8B6F47' : 'white'};
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          cursor: pointer;
        `;
      }

      return el;
    },
    []
  );

  // Update marker element styling without replacing it
  const updateMarkerStyle = useCallback((el: HTMLElement, shop: Shop, isSelected: boolean) => {
    el.style.borderColor = isSelected ? '#8B6F47' : 'white';
    el.className = `shop-marker${isSelected ? ' selected' : ''}`;
  }, []);

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

  // Update markers when shops change
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markers.current.forEach((marker) => marker.remove());
    markers.current.clear();

    // Add new markers
    shops.forEach((shop) => {
      const coords = getCoords(shop);
      if (!coords) return;

      const isSelected = shop.documentId === selectedShop?.documentId;
      const el = createMarkerElement(shop, isSelected);

      const marker = new mapboxgl.Marker({
        element: el,
        anchor: 'center',
      })
        .setLngLat(coords)
        .addTo(map.current!);

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onShopSelect(shop);
      });

      markers.current.set(shop.documentId, marker);
    });
  }, [shops, createMarkerElement, onShopSelect, selectedShop?.documentId, getCoords]);

  // Update selected marker styling
  useEffect(() => {
    if (!map.current) return;

    // Reset previous selected marker
    if (selectedMarkerRef.current && markers.current.has(selectedMarkerRef.current)) {
      const prevShop = shops.find((s) => s.documentId === selectedMarkerRef.current);
      if (prevShop) {
        const marker = markers.current.get(selectedMarkerRef.current);
        if (marker) {
          updateMarkerStyle(marker.getElement(), prevShop, false);
        }
      }
    }

    // Style new selected marker
    if (selectedShop && markers.current.has(selectedShop.documentId)) {
      const marker = markers.current.get(selectedShop.documentId);
      if (marker) {
        updateMarkerStyle(marker.getElement(), selectedShop, true);

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
  }, [selectedShop, shops, updateMarkerStyle, getCoords]);

  return <div ref={mapContainer} className="map-container" />;
}
