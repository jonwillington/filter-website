import { useEffect, useRef, useCallback } from 'react';
import mapboxgl, { MapSourceDataEvent, MapLayerMouseEvent } from 'mapbox-gl';
import { Shop } from '../types';
import {
  getShopCoords,
  calculateLocalDensity,
  getZoomBracket,
} from '../utils/mapGeometry';
import { createMarkerElement, updateMarkerStyle } from '../utils/mapMarkers';

// Industry standard clustering parameters (Mapbox/Supercluster best practices)
const CLUSTER_RADIUS = 50; // Optimal radius for urban density (40-60 recommended)
const CLUSTER_MAX_ZOOM = 14; // Continue clustering until street level (14-16 recommended)

export interface UseMapClusteringOptions {
  map: mapboxgl.Map | null;
  mapReady: boolean;
  shops: Shop[];
  selectedShop: Shop | null;
  effectiveTheme: 'light' | 'dark';
  currentZoom: number;
  onShopSelect: (shop: Shop) => void;
  onTransitionComplete?: () => void;
  isLoading: boolean;
}

/**
 * Hook to manage map clustering, markers, and related interactions.
 *
 * IMPORTANT: This hook depends on mapReady to ensure it runs AFTER the map is initialized.
 * Do not remove mapReady from dependencies - it prevents a race condition where
 * clustering setup runs before the map exists.
 */
export function useMapClustering({
  map,
  mapReady,
  shops,
  selectedShop,
  effectiveTheme,
  currentZoom,
  onShopSelect,
  onTransitionComplete,
  isLoading,
}: UseMapClusteringOptions): void {
  // Refs for markers and state tracking
  const markers = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const selectedMarkerRef = useRef<string | null>(null);
  const isZooming = useRef<boolean>(false);
  const isDragging = useRef<boolean>(false);
  const isTransitioning = useRef<boolean>(false);
  const hasCalledTransitionComplete = useRef<boolean>(false);
  const wasAboveZoomThreshold = useRef(getZoomBracket(currentZoom));
  const previousShopIdsRef = useRef<string>('');
  const previousThemeRef = useRef<string>(effectiveTheme);

  // Store callbacks in refs to avoid re-running setup when they change
  const onShopSelectRef = useRef(onShopSelect);
  const onTransitionCompleteRef = useRef(onTransitionComplete);

  useEffect(() => {
    onShopSelectRef.current = onShopSelect;
    onTransitionCompleteRef.current = onTransitionComplete;
  }, [onShopSelect, onTransitionComplete]);

  // Track loading state changes
  useEffect(() => {
    if (isLoading) {
      isTransitioning.current = true;
      hasCalledTransitionComplete.current = false;
    }
  }, [isLoading]);

  // Create marker element helper bound to current theme
  const createMarkerElementForShop = useCallback(
    (shop: Shop, isSelected: boolean, fadeIn: boolean, density: number, zoomLevel: number) => {
      return createMarkerElement(shop, isSelected, effectiveTheme, {
        fadeIn,
        density,
        zoomLevel,
      });
    },
    [effectiveTheme]
  );

  // Setup clustering source and layers
  // IMPORTANT: This effect depends on mapReady to ensure it runs AFTER the map is initialized
  useEffect(() => {
    if (!map || !mapReady) return;

    // Compare shop IDs and theme to determine if we need full re-setup
    const currentShopIds = shops.map(s => s.documentId).sort().join(',');
    const themeChanged = effectiveTheme !== previousThemeRef.current;
    const shopsChanged = currentShopIds !== previousShopIdsRef.current;

    // Update refs
    previousShopIdsRef.current = currentShopIds;
    previousThemeRef.current = effectiveTheme;

    // If nothing changed and we have markers, skip re-setup
    if (!shopsChanged && !themeChanged && markers.current.size > 0) {
      return;
    }

    // Always do full re-setup when shops or theme changes
    // This ensures layers are properly recreated with new data
    const m = map;

    const setupClustering = () => {
      // Safety check - ensure map is still valid
      if (!m || !m.getStyle()) {
        console.warn('[Clustering] Map not ready for setup, will retry');
        return;
      }

      console.log('[Clustering] Setting up with', shops.length, 'shops');

      // Remove existing source and layers if they exist
      try {
        if (m.getLayer('cluster-count')) m.removeLayer('cluster-count');
        if (m.getLayer('unclustered-point')) m.removeLayer('unclustered-point');
        if (m.getLayer('clusters')) m.removeLayer('clusters');
        if (m.getSource('shops')) m.removeSource('shops');
      } catch (e) {
        console.warn('Error removing existing layers:', e);
      }

      // Clear existing markers
      markers.current.forEach((marker) => marker.remove());
      markers.current.clear();

      // Create GeoJSON from displayed shops with country color
      const features: GeoJSON.Feature[] = [];
      shops.forEach((shop) => {
        const coords = getShopCoords(shop);
        if (!coords) return;

        const countryColor =
          shop.location?.country?.primaryColor ||
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

      console.log('[Clustering] Created GeoJSON with', features.length, 'features');

      // Add clustered source with industry-standard configuration
      try {
        m.addSource('shops', {
        type: 'geojson',
        data: geojson,
        cluster: true,
        clusterRadius: CLUSTER_RADIUS,
        clusterMaxZoom: CLUSTER_MAX_ZOOM,
        clusterProperties: {
          clusterColor: ['coalesce', ['get', 'countryColor'], '#8B6F47'],
        },
      });

      // Add cluster circle layer with dynamic country colors and zoom-based sizing
      // Clusters should always be larger than individual markers at each zoom level
      m.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'shops',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': ['coalesce', ['get', 'clusterColor'], '#8B6F47'],
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 6,
            3, 8,
            4, 10,
            5, ['step', ['get', 'point_count'], 14, 10, 20, 50, 26, 100, 32],
            9, ['step', ['get', 'point_count'], 16, 10, 22, 30, 28, 50, 34],
            12, ['step', ['get', 'point_count'], 16, 5, 20, 10, 24, 20, 28],
            13, ['step', ['get', 'point_count'], 14, 3, 18, 5, 20, 10, 22],
            14, ['step', ['get', 'point_count'], 14, 3, 16, 5, 18, 10, 20],
            15, 0,
          ],
          'circle-stroke-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 1.5,
            4, 2,
            5, 3,
            12, 2.5,
            14, 2,
            15, 0,
          ],
          'circle-stroke-color': '#fff',
          'circle-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 0.75,
            4, 0.85,
            5, 0.9,
            11, 0.9,
            13, 0.85,
            14, 0.5,
            15, 0,
          ],
          'circle-color-transition': { duration: 0 },
          'circle-radius-transition': { duration: 0 },
          'circle-stroke-width-transition': { duration: 0 },
        },
      });

      // Add unclustered points layer (individual markers - smaller than clusters)
      m.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'shops',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': ['coalesce', ['get', 'countryColor'], '#8B6F47'],
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 4,
            3, 5,
            4, 6,
            5, 8,
            9, 10,
            12, 11,
            14, 11,
            15, 0,
          ],
          'circle-stroke-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 1.5,
            5, 2,
            12, 2,
            14, 2,
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
            14, 0.7,
            15, 0,
          ],
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
          'text-size': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 0,
            4, 0,
            5, 12,
            8, 14,
            11, 13,
            12, 12,
            13, 10,
            14, 8,
            15, 0,
          ],
        },
        paint: {
          'text-color': '#ffffff',
          'text-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 0,
            4, 0,
            5, 1,
            11, 1,
            13, 0.9,
            14, 0.5,
            15, 0,
          ],
        },
      });
        console.log('[Clustering] Layers added successfully');
      } catch (e) {
        console.error('[Clustering] Error adding map layers:', e);
        return;
      }

      // Click on cluster to zoom in
      m.on('click', 'clusters', (e: MapLayerMouseEvent) => {
        const features = m.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        if (!features.length) return;

        const clusterId = features[0].properties?.cluster_id;
        const source = m.getSource?.('shops') as mapboxgl.GeoJSONSource;
        if (!source) return;
        const geometry = features[0].geometry as GeoJSON.Point;

        source.getClusterExpansionZoom(clusterId, (err: Error | null | undefined, expansionZoom: number | null | undefined) => {
          if (err) {
            console.error('Error expanding cluster:', err);
            return;
          }
          m.flyTo({
            center: geometry.coordinates as [number, number],
            zoom: expansionZoom ?? 14,
            duration: 900,
            padding: { left: 200, right: 0, top: 0, bottom: 0 },
            essential: true,
            easing: (t) => 1 - Math.pow(1 - t, 3), // ease-out cubic
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
      m.on('click', 'unclustered-point', (e: MapLayerMouseEvent) => {
        const features = m.queryRenderedFeatures(e.point, {
          layers: ['unclustered-point'],
        });
        if (!features.length) return;

        const shopId = features[0].properties?.id;
        const shop = shops.find((s) => s.documentId === shopId);
        if (shop) {
          onShopSelectRef.current(shop);
          const geometry = features[0].geometry as GeoJSON.Point;
          const currentMapZoom = m.getZoom();
          const targetZoom = Math.max(currentMapZoom, 14); // Don't zoom out if already zoomed in
          m.flyTo({
            center: geometry.coordinates as [number, number],
            zoom: targetZoom,
            duration: currentMapZoom >= 14 ? 800 : 1200, // Faster if just panning
            padding: { left: 200, right: 0, top: 0, bottom: 0 },
            essential: true,
            easing: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, // ease-in-out cubic
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

      // Update marker visibility based on zoom
      const updateMarkerVisibility = () => {
        const currentMapZoom = m.getZoom();
        const showMarkers = currentMapZoom >= CLUSTER_MAX_ZOOM;

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
      };

      // Create all markers upfront
      const createAllMarkers = () => {
        const mapZoom = m.getZoom();

        shops.forEach((shop) => {
          const id = shop.documentId;
          const coords = getShopCoords(shop);
          if (!coords) return;

          if (markers.current.has(id)) return;

          const isSelected = id === selectedMarkerRef.current;
          const density = calculateLocalDensity(shop, shops);
          const el = createMarkerElementForShop(shop, isSelected, false, density, mapZoom);

          el.style.display = 'none';
          el.style.opacity = '0';

          const marker = new mapboxgl.Marker({
            element: el,
            anchor: 'center',
          })
            .setLngLat(coords)
            .addTo(m);

          el.addEventListener('click', (e: MouseEvent) => {
            e.stopPropagation();
            onShopSelectRef.current(shop);
          });

          markers.current.set(id, marker);
        });
      };

      // Event handlers
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

          if (
            isTransitioning.current &&
            !hasCalledTransitionComplete.current &&
            onTransitionCompleteRef.current
          ) {
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

      // Cleanup function - remove ALL event listeners we added
      return () => {
        clearTimeout(ensureMarkersTimeout);
        m.off('dragstart', handleDragStart);
        m.off('dragend', handleDragEnd);
        m.off('zoomstart', handleZoomStart);
        m.off('zoomend', handleZoomEnd);
        m.off('sourcedata', handleSourceData);
        m.off('idle', handleIdle);

        // Remove layer-specific click handlers
        // Note: We can't easily remove anonymous handlers, but removing the layers
        // will effectively disable them. The cleanup in the effect will remove layers.
      };
    };

    // Run setup with retry logic to handle timing issues during map animations
    let cleanup: (() => void) | undefined;
    let retryTimeout: NodeJS.Timeout | undefined;
    let initialTimeout: NodeJS.Timeout | undefined;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    const attemptSetup = () => {
      // Try to run setup
      cleanup = setupClustering();

      // If setup returned undefined (failed), retry after a delay
      if (!cleanup && retryCount < MAX_RETRIES) {
        retryCount++;
        retryTimeout = setTimeout(() => {
          if (m && m.getStyle()) {
            cleanup = setupClustering();
          }
        }, 100 * retryCount); // Increasing delay: 100ms, 200ms, 300ms
      }
    };

    // Only delay if shops actually changed (to let map animations settle)
    // Run immediately on initial setup or theme change
    if (shopsChanged && markers.current.size > 0) {
      initialTimeout = setTimeout(attemptSetup, 50);
    } else {
      attemptSetup();
    }

    return () => {
      clearTimeout(initialTimeout);
      if (retryTimeout) clearTimeout(retryTimeout);
      cleanup?.();
      // Note: Don't remove layers here - they should persist until setupClustering
      // runs again with new data. Removing them here causes a flash.
    };
  }, [shops, createMarkerElementForShop, mapReady, map, effectiveTheme]);

  // Recreate markers when crossing zoom thresholds for size/style changes
  // Use a ref to track pending recreation to debounce rapid zoom changes
  const pendingRecreationRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!map || shops.length === 0 || markers.current.size === 0) return;

    const currentBracket = getZoomBracket(currentZoom);
    const previousBracket = wasAboveZoomThreshold.current;

    if (previousBracket !== currentBracket) {
      wasAboveZoomThreshold.current = currentBracket;

      // Clear any pending recreation
      if (pendingRecreationRef.current) {
        clearTimeout(pendingRecreationRef.current);
      }

      // Debounce marker recreation to avoid flashing during rapid zoom changes
      pendingRecreationRef.current = setTimeout(() => {
        // Safety check - map may have been unmounted or in invalid state
        try {
          if (!map || typeof map.getSource !== 'function') return;
          const source = map.getSource('shops') as mapboxgl.GeoJSONSource;
          if (!source) return;
        } catch {
          return;
        }

        // Get actual current zoom from map (not the prop which may be stale)
        const actualZoom = map.getZoom();

        // Clear and recreate all markers with new zoom level
        markers.current.forEach((marker) => marker.remove());
        markers.current.clear();

        shops.forEach((shop) => {
          const id = shop.documentId;
          const coords = getShopCoords(shop);
          if (!coords) return;

          const isSelected = id === selectedMarkerRef.current;
          const density = calculateLocalDensity(shop, shops);
          const el = createMarkerElementForShop(shop, isSelected, false, density, actualZoom);

          el.style.display = 'none';
          el.style.opacity = '0';

          const marker = new mapboxgl.Marker({
            element: el,
            anchor: 'center',
          })
            .setLngLat(coords)
            .addTo(map);

          el.addEventListener('click', (e: MouseEvent) => {
            e.stopPropagation();
            onShopSelectRef.current(shop);
          });

          markers.current.set(id, marker);
        });

        // Show markers only after clusters are gone (>= 14)
        const showMarkers = actualZoom >= CLUSTER_MAX_ZOOM;

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
      }, 150); // Wait for zoom animation to settle
    }

    return () => {
      if (pendingRecreationRef.current) {
        clearTimeout(pendingRecreationRef.current);
      }
    };
  }, [currentZoom, shops, createMarkerElementForShop, map]);

  // Update selected marker styling
  useEffect(() => {
    if (!map) return;

    // Reset previous selected marker
    if (selectedMarkerRef.current && markers.current.has(selectedMarkerRef.current)) {
      const marker = markers.current.get(selectedMarkerRef.current);
      const prevShop = shops.find((s) => s.documentId === selectedMarkerRef.current);
      if (marker) {
        updateMarkerStyle(marker.getElement(), false, prevShop);
      }
    }

    // Style new selected marker (position handled by useMapPosition)
    if (selectedShop && markers.current.has(selectedShop.documentId)) {
      const marker = markers.current.get(selectedShop.documentId);
      if (marker) {
        updateMarkerStyle(marker.getElement(), true, selectedShop);
      }
    }

    selectedMarkerRef.current = selectedShop?.documentId || null;
  }, [selectedShop, shops, map]);
}
