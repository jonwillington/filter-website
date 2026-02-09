'use client';

import { useEffect, useRef, useMemo, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Shop } from '@/lib/types';
import { getShopCoords } from '@/lib/utils/mapGeometry';

interface CriticsPicksMapProps {
  shops: Shop[];
}

const ACCENT = '#B8956A';

export default function CriticsPicksMap({ shops }: CriticsPicksMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Extract shops with valid coordinates
  const shopsWithCoords = useMemo(() => {
    const result: { shop: Shop; coords: [number, number] }[] = [];
    for (const shop of shops) {
      const coords = getShopCoords(shop);
      if (coords) result.push({ shop, coords });
    }
    return result;
  }, [shops]);

  // IntersectionObserver for lazy init
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Initialize map once visible
  useEffect(() => {
    if (!isVisible || !containerRef.current || mapRef.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [0, 30],
      zoom: 1,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
    });

    map.on('load', () => {
      mapRef.current = map;
      setMapReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [isVisible]);

  // Update markers and bounds when shops change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Clear old markers
    for (const m of markersRef.current) m.remove();
    markersRef.current = [];

    if (shopsWithCoords.length === 0) return;

    // Add dot markers
    for (const { coords } of shopsWithCoords) {
      const dot = document.createElement('div');
      dot.style.width = '10px';
      dot.style.height = '10px';
      dot.style.borderRadius = '50%';
      dot.style.backgroundColor = ACCENT;
      dot.style.boxShadow = `0 0 6px 2px ${ACCENT}66`;

      const marker = new mapboxgl.Marker({ element: dot })
        .setLngLat(coords)
        .addTo(map);

      markersRef.current.push(marker);
    }

    // Fit bounds
    if (shopsWithCoords.length === 1) {
      map.jumpTo({ center: shopsWithCoords[0].coords, zoom: 13 });
    } else {
      const bounds = new mapboxgl.LngLatBounds();
      for (const { coords } of shopsWithCoords) {
        bounds.extend(coords);
      }
      map.fitBounds(bounds, {
        padding: 50,
        maxZoom: 14,
        duration: 800,
      });
    }
  }, [shopsWithCoords, mapReady]);

  // All hooks above — safe to early return
  if (shopsWithCoords.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="h-40 md:h-48 lg:h-56"
    />
  );
}
