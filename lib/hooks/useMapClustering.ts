import { useEffect, useRef, useMemo } from 'react';
import mapboxgl, { MapSourceDataEvent, MapLayerMouseEvent } from 'mapbox-gl';
import { Shop } from '../types';
import {
  getShopCoords,
  getZoomBracket,
} from '../utils/mapGeometry';
import { createLogoBadgeElement, updateLogoBadgeStyle, loadLogoBadgeImage } from '../utils/mapMarkers';

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
  expandedCityAreaId?: string | null;
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
  expandedCityAreaId = null,
}: UseMapClusteringOptions): void {
  // Refs for logo badges and state tracking
  const logoBadges = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const selectedMarkerRef = useRef<string | null>(null);
  const isZooming = useRef<boolean>(false);
  const isDragging = useRef<boolean>(false);
  const isTransitioning = useRef<boolean>(false);
  const hasCalledTransitionComplete = useRef<boolean>(false);
  const wasAboveZoomThreshold = useRef(getZoomBracket(currentZoom));
  const previousShopIdsRef = useRef<string>('');
  const previousCityAreaIdRef = useRef<string | null>(null);
  const badgeShowTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isProgrammaticMove = useRef<boolean>(false);

  // Store callbacks in refs to avoid re-running setup when they change
  const onShopSelectRef = useRef(onShopSelect);
  const onTransitionCompleteRef = useRef(onTransitionComplete);

  useEffect(() => {
    onShopSelectRef.current = onShopSelect;
    onTransitionCompleteRef.current = onTransitionComplete;
  }, [onShopSelect, onTransitionComplete]);

  // Memoize shop IDs string to detect actual data changes (not just reference changes)
  // This prevents the clustering effect from re-running when shops array reference
  // changes but the actual shop data is identical
  const shopIdsString = useMemo(() => {
    return shops.map(s => s.documentId).sort().join(',');
  }, [shops]);

  // Keep a stable reference to shops array when IDs haven't changed
  const shopsRef = useRef(shops);
  useEffect(() => {
    shopsRef.current = shops;
  }, [shops]);

  // Track loading state changes
  useEffect(() => {
    if (isLoading) {
      isTransitioning.current = true;
      hasCalledTransitionComplete.current = false;
    }
  }, [isLoading]);

  // Zoom threshold for showing logo badges (above circle markers)
  const LOGO_BADGE_ZOOM = 15;

  // Setup clustering source and layers
  // IMPORTANT: This effect depends on mapReady to ensure it runs AFTER the map is initialized
  // Using shopIdsString instead of shops array prevents re-runs when only the reference changes
  useEffect(() => {
    if (!map || !mapReady) return;

    // Get current shops from ref (updated separately via useEffect above)
    const currentShops = shopsRef.current;

    // Check if shops actually changed (by IDs, not reference)
    const shopsChanged = shopIdsString !== previousShopIdsRef.current;
    const cityAreaChanged = expandedCityAreaId !== previousCityAreaIdRef.current;
    previousShopIdsRef.current = shopIdsString;
    previousCityAreaIdRef.current = expandedCityAreaId;

    console.log('[Clustering Effect] Running - shopsChanged:', shopsChanged, 'cityAreaChanged:', cityAreaChanged, 'badgeCount:', logoBadges.current.size);

    const m = map;

    const setupClustering = () => {
      // Safety check - ensure map is still valid
      if (!m || !m.getStyle()) {
        console.warn('[Clustering] Map not ready for setup, will retry');
        return;
      }

      // Only recreate layers/badges if shops actually changed, city area changed, or first run
      const sourceExists = !!m.getSource('shops');
      const needsRecreation = shopsChanged || cityAreaChanged || !sourceExists;

      console.log('[setupClustering] sourceExists:', sourceExists, 'needsRecreation:', needsRecreation, 'expandedCityAreaId:', expandedCityAreaId);

      if (needsRecreation) {
        console.log('[Clustering] Setting up with', currentShops.length, 'shops');

        // Remove existing source and layers if they exist
        try {
          if (m.getLayer('cluster-count')) m.removeLayer('cluster-count');
          if (m.getLayer('unclustered-point')) m.removeLayer('unclustered-point');
          if (m.getLayer('clusters')) m.removeLayer('clusters');
          if (m.getLayer('city-area-points')) m.removeLayer('city-area-points');
          if (m.getSource('shops')) m.removeSource('shops');
          if (m.getSource('city-area-shops')) m.removeSource('city-area-shops');
        } catch (e) {
          console.warn('Error removing existing layers:', e);
        }

        // Clear existing logo badges
        logoBadges.current.forEach((marker) => marker.remove());
        logoBadges.current.clear();
      } else {
        console.log('[Clustering] Skipping recreation (shops unchanged), refreshing listeners only');
      }

      // Only create layers if shops actually changed
      if (needsRecreation) {
        // Split shops: city area shops (unclustered) vs other shops (clustered)
        const cityAreaShops: Shop[] = [];
        const otherShops: Shop[] = [];

        currentShops.forEach((shop) => {
          const shopCityAreaId = shop.city_area?.documentId || shop.cityArea?.documentId;
          if (expandedCityAreaId && shopCityAreaId === expandedCityAreaId) {
            cityAreaShops.push(shop);
          } else {
            otherShops.push(shop);
          }
        });

        console.log('[Clustering] Split shops - cityArea:', cityAreaShops.length, 'other:', otherShops.length);

        // Create GeoJSON for clustered shops (not in expanded city area)
        const clusteredFeatures: GeoJSON.Feature[] = [];
        otherShops.forEach((shop) => {
          const coords = getShopCoords(shop);
          if (!coords) return;

          const countryColor =
            shop.location?.country?.primaryColor ||
            shop.city_area?.location?.country?.primaryColor ||
            '#8B6F47';

          clusteredFeatures.push({
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

        // Create GeoJSON for city area shops (unclustered)
        const cityAreaFeatures: GeoJSON.Feature[] = [];
        cityAreaShops.forEach((shop) => {
          const coords = getShopCoords(shop);
          if (!coords) return;

          const countryColor =
            shop.location?.country?.primaryColor ||
            shop.city_area?.location?.country?.primaryColor ||
            '#8B6F47';

          cityAreaFeatures.push({
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

        const clusteredGeojson: GeoJSON.FeatureCollection = {
          type: 'FeatureCollection',
          features: clusteredFeatures,
        };

        const cityAreaGeojson: GeoJSON.FeatureCollection = {
          type: 'FeatureCollection',
          features: cityAreaFeatures,
        };

        console.log('[Clustering] Created GeoJSON - clustered:', clusteredFeatures.length, 'cityArea:', cityAreaFeatures.length);

        // Opacity for shops outside the focused city area (hidden when area is expanded)
        const outsideAreaOpacity = expandedCityAreaId ? 0 : 0.9;
        const outsideAreaStrokeOpacity = expandedCityAreaId ? 0 : 1;

        // Add clustered source with industry-standard configuration
        try {
          m.addSource('shops', {
            type: 'geojson',
            data: clusteredGeojson,
            cluster: true,
            clusterRadius: CLUSTER_RADIUS,
            clusterMaxZoom: CLUSTER_MAX_ZOOM,
            clusterProperties: {
              clusterColor: ['coalesce', ['get', 'countryColor'], '#8B6F47'],
            },
          });

          // Add unclustered source for city area shops
          if (cityAreaFeatures.length > 0) {
            m.addSource('city-area-shops', {
              type: 'geojson',
              data: cityAreaGeojson,
              cluster: false,
            });
          }

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
                // Keep clusters visible but smaller at high zoom
                16, ['step', ['get', 'point_count'], 10, 3, 12, 5, 14, 10, 16],
                18, ['step', ['get', 'point_count'], 8, 3, 10, 5, 12, 10, 14],
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
                16, 1.5,
              ],
              'circle-stroke-color': '#fff',
              'circle-opacity': outsideAreaOpacity,
              'circle-stroke-opacity': outsideAreaStrokeOpacity,
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
                14, 12,
                // Stay visible at high zoom
                16, 14,
                18, 16,
              ],
              'circle-stroke-width': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0, 1.5,
                5, 2,
                12, 2,
                14, 2.5,
                16, 3,
              ],
              'circle-stroke-color': '#fff',
              'circle-opacity': expandedCityAreaId
                ? outsideAreaOpacity
                : [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    0, 0.75,
                    5, 0.9,
                    11, 0.9,
                    13, 0.9,
                    14, 0.9,
                    // Fade out when logo badges appear (zoom 15+)
                    14.5, 0.6,
                    15, 0,
                  ],
              'circle-stroke-opacity': expandedCityAreaId
                ? outsideAreaStrokeOpacity
                : [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    14, 1,
                    14.5, 0.6,
                    15, 0,
                  ],
            },
          });

          // Add city area points layer (unclustered, for expanded city area)
          if (m.getSource('city-area-shops')) {
            m.addLayer({
              id: 'city-area-points',
              type: 'circle',
              source: 'city-area-shops',
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
                  14, 12,
                  16, 14,
                  18, 16,
                ],
                'circle-stroke-width': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  0, 1.5,
                  5, 2,
                  12, 2,
                  14, 2.5,
                  16, 3,
                ],
                'circle-stroke-color': '#fff',
                'circle-opacity': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  0, 0.75,
                  5, 0.9,
                  14, 0.9,
                  // Fade out when logo badges appear (zoom 15+)
                  14.5, 0.6,
                  15, 0,
                ],
                'circle-stroke-opacity': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  14, 1,
                  14.5, 0.6,
                  15, 0,
                ],
              },
            });
          }

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
              'text-opacity': expandedCityAreaId
                ? outsideAreaOpacity
                : [
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
      } // End of needsMarkerRecreation conditional

      // Layer click handlers - these are added fresh each time since we can't easily
      // reference and remove them. The layers already exist if !needsMarkerRecreation.
      // Note: Mapbox will have multiple handlers if we don't track them, but since
      // the cleanup function runs before each setup, we're okay.

      // Click on cluster to zoom in
      const handleClusterClick = (e: MapLayerMouseEvent) => {
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
      };

      // Change cursor on cluster hover
      const handleClusterEnter = () => {
        m.getCanvas().style.cursor = 'pointer';
      };
      const handleClusterLeave = () => {
        m.getCanvas().style.cursor = '';
      };

      // Click on unclustered point to select the shop
      const handleUnclusteredClick = (e: MapLayerMouseEvent) => {
        const features = m.queryRenderedFeatures(e.point, {
          layers: ['unclustered-point'],
        });
        if (!features.length) return;

        const shopId = features[0].properties?.id;
        const shop = shopsRef.current.find((s) => s.documentId === shopId);
        if (shop) {
          // Mark as programmatic move so badges stay visible
          isProgrammaticMove.current = true;
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
      };

      // Change cursor on unclustered point hover
      const handleUnclusteredEnter = () => {
        m.getCanvas().style.cursor = 'pointer';
      };
      const handleUnclusteredLeave = () => {
        m.getCanvas().style.cursor = '';
      };

      // Click on city area point to select the shop
      const handleCityAreaClick = (e: MapLayerMouseEvent) => {
        const features = m.queryRenderedFeatures(e.point, {
          layers: ['city-area-points'],
        });
        if (!features.length) return;

        const shopId = features[0].properties?.id;
        const shop = shopsRef.current.find((s) => s.documentId === shopId);
        if (shop) {
          isProgrammaticMove.current = true;
          onShopSelectRef.current(shop);
          const geometry = features[0].geometry as GeoJSON.Point;
          const currentMapZoom = m.getZoom();
          const targetZoom = Math.max(currentMapZoom, 14);
          m.flyTo({
            center: geometry.coordinates as [number, number],
            zoom: targetZoom,
            duration: currentMapZoom >= 14 ? 800 : 1200,
            padding: { left: 200, right: 0, top: 0, bottom: 0 },
            essential: true,
            easing: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
          });
        }
      };

      const handleCityAreaEnter = () => {
        m.getCanvas().style.cursor = 'pointer';
      };
      const handleCityAreaLeave = () => {
        m.getCanvas().style.cursor = '';
      };

      // Add layer event listeners (only if layers exist)
      if (m.getLayer('clusters')) {
        m.on('click', 'clusters', handleClusterClick);
        m.on('mouseenter', 'clusters', handleClusterEnter);
        m.on('mouseleave', 'clusters', handleClusterLeave);
      }
      if (m.getLayer('unclustered-point')) {
        m.on('click', 'unclustered-point', handleUnclusteredClick);
        m.on('mouseenter', 'unclustered-point', handleUnclusteredEnter);
        m.on('mouseleave', 'unclustered-point', handleUnclusteredLeave);
      }
      if (m.getLayer('city-area-points')) {
        m.on('click', 'city-area-points', handleCityAreaClick);
        m.on('mouseenter', 'city-area-points', handleCityAreaEnter);
        m.on('mouseleave', 'city-area-points', handleCityAreaLeave);
      }

      // Track whether badges have been created yet (lazy creation)
      let badgesCreated = false;

      // Update logo badge visibility based on zoom and movement state
      // Uses CSS class toggling for GPU-accelerated transitions instead of JS-driven opacity
      const updateBadgeVisibility = (forceHide: boolean = false) => {
        const currentMapZoom = m.getZoom();
        const shouldShow = !forceHide && currentMapZoom >= LOGO_BADGE_ZOOM && !isZooming.current && !isDragging.current;
        console.log('[updateBadgeVisibility] zoom:', currentMapZoom.toFixed(2), 'shouldShow:', shouldShow, 'programmatic:', isProgrammaticMove.current, 'badgesCreated:', badgesCreated);

        // Cancel any pending show
        if (badgeShowTimeoutRef.current) {
          clearTimeout(badgeShowTimeoutRef.current);
          badgeShowTimeoutRef.current = null;
        }

        if (shouldShow) {
          // Lazy create badges only when we're zoomed in enough to see them
          if (!badgesCreated) {
            createAllLogoBadges();
            badgesCreated = true;
          }

          // Shorter delay for programmatic moves (shop-to-shop), longer for user movement
          const delay = isProgrammaticMove.current ? 50 : 150;
          badgeShowTimeoutRef.current = setTimeout(() => {
            logoBadges.current.forEach((marker) => {
              const el = marker.getElement();
              // Lazy load the logo image when badge becomes visible
              loadLogoBadgeImage(el);
              // Use CSS class for GPU-accelerated transition
              el.classList.remove('badge-hidden');
              el.classList.add('badge-visible');
            });
          }, delay);
        } else {
          // Use CSS class for smooth fade out
          logoBadges.current.forEach((marker) => {
            const el = marker.getElement();
            el.classList.remove('badge-visible');
            el.classList.add('badge-hidden');
          });
        }
      };

      // Create logo badges for shops that have brand logos
      const createAllLogoBadges = () => {
        const mapZoom = m.getZoom();
        const existingCount = logoBadges.current.size;
        let createdCount = 0;

        shopsRef.current.forEach((shop) => {
          const id = shop.documentId;
          const coords = getShopCoords(shop);
          if (!coords) return;

          if (logoBadges.current.has(id)) return;

          const isSelected = id === selectedMarkerRef.current;
          const el = createLogoBadgeElement(shop, isSelected, effectiveTheme, {
            fadeIn: false,
            zoomLevel: mapZoom,
          });

          // Skip if no badge was created
          if (!el) return;
          createdCount++;

          // Add CSS class for styling and start hidden
          el.classList.add('logo-badge', 'badge-hidden');

          // Hide badges for shops not in the expanded city area
          const shopCityAreaId = shop.city_area?.documentId || (shop as any).cityArea?.documentId;
          const isInExpandedArea = !expandedCityAreaId || shopCityAreaId === expandedCityAreaId;
          if (!isInExpandedArea) {
            el.style.opacity = '0';
            el.style.pointerEvents = 'none';
          }

          const marker = new mapboxgl.Marker({
            element: el,
            anchor: 'center',
          })
            .setLngLat(coords)
            .addTo(m);

          el.addEventListener('click', (e: MouseEvent) => {
            e.stopPropagation();
            console.log('[Logo Badge Click] Shop:', shop.documentId);
            // Mark as programmatic move so badges stay visible
            isProgrammaticMove.current = true;
            onShopSelectRef.current(shop);
          });

          logoBadges.current.set(id, marker);
        });
        console.log('[createAllLogoBadges] existing:', existingCount, 'created:', createdCount, 'total:', logoBadges.current.size);
      };

      // Track if badges are currently hidden due to movement
      let badgesHiddenForMovement = false;

      // Event handlers
      const hideBadgesForMovement = () => {
        if (!badgesHiddenForMovement) {
          badgesHiddenForMovement = true;
          // Cancel any pending show
          if (badgeShowTimeoutRef.current) {
            clearTimeout(badgeShowTimeoutRef.current);
            badgeShowTimeoutRef.current = null;
          }
          // Hide immediately using CSS class
          logoBadges.current.forEach((marker) => {
            const el = marker.getElement();
            el.classList.remove('badge-visible');
            el.classList.add('badge-hidden');
          });
        }
      };

      const handleMoveStart = () => {
        hideBadgesForMovement();
      };

      const handleMove = () => {
        hideBadgesForMovement();
      };

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
      };

      const handleSourceData = (e: mapboxgl.MapSourceDataEvent) => {
        if (e.sourceId === 'shops' && e.isSourceLoaded) {
          updateBadgeVisibility();
        }
      };

      const handleIdle = () => {
        if (!isZooming.current && !isDragging.current) {
          const currentMapZoom = m.getZoom();
          const currentBracket = getZoomBracket(currentMapZoom);
          const previousBracket = wasAboveZoomThreshold.current;

          console.log('[handleIdle] zoom:', currentMapZoom.toFixed(2), 'bracket:', currentBracket, 'prevBracket:', previousBracket, 'badgeCount:', logoBadges.current.size);

          // Track bracket changes
          if (previousBracket !== currentBracket) {
            console.log('[handleIdle] Bracket changed from', previousBracket, 'to', currentBracket);
            wasAboveZoomThreshold.current = currentBracket;
          }

          // Reset movement flags and show badges
          badgesHiddenForMovement = false;
          isProgrammaticMove.current = false;
          updateBadgeVisibility();

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
      m.on('movestart', handleMoveStart);
      m.on('move', handleMove);
      m.on('dragstart', handleDragStart);
      m.on('dragend', handleDragEnd);
      m.on('zoomstart', handleZoomStart);
      m.on('zoomend', handleZoomEnd);
      m.on('sourcedata', handleSourceData);
      m.on('idle', handleIdle);

      // Update badge visibility based on zoom (badges created lazily when needed)
      updateBadgeVisibility();

      // Force map resize to ensure rendering
      m.resize();

      // Also update visibility after a short delay (fixes timing issues)
      const ensureMarkersTimeout = setTimeout(() => {
        updateBadgeVisibility();
        m.resize();
      }, 100);

      // Cleanup function - remove ALL event listeners we added
      return () => {
        console.log('[Cleanup] Removing event listeners, badgeCount:', logoBadges.current.size);
        clearTimeout(ensureMarkersTimeout);
        if (badgeShowTimeoutRef.current) {
          clearTimeout(badgeShowTimeoutRef.current);
          badgeShowTimeoutRef.current = null;
        }

        // Safety check - map might be destroyed during cleanup
        if (!m || !m.getStyle()) {
          console.log('[Cleanup] Map already destroyed, skipping listener removal');
          return;
        }

        m.off('movestart', handleMoveStart);
        m.off('move', handleMove);
        m.off('dragstart', handleDragStart);
        m.off('dragend', handleDragEnd);
        m.off('zoomstart', handleZoomStart);
        m.off('zoomend', handleZoomEnd);
        m.off('sourcedata', handleSourceData);
        m.off('idle', handleIdle);

        // Remove layer-specific click handlers
        if (m.getLayer('clusters')) {
          m.off('click', 'clusters', handleClusterClick);
          m.off('mouseenter', 'clusters', handleClusterEnter);
          m.off('mouseleave', 'clusters', handleClusterLeave);
        }
        if (m.getLayer('unclustered-point')) {
          m.off('click', 'unclustered-point', handleUnclusteredClick);
          m.off('mouseenter', 'unclustered-point', handleUnclusteredEnter);
          m.off('mouseleave', 'unclustered-point', handleUnclusteredLeave);
        }
        if (m.getLayer('city-area-points')) {
          m.off('click', 'city-area-points', handleCityAreaClick);
          m.off('mouseenter', 'city-area-points', handleCityAreaEnter);
          m.off('mouseleave', 'city-area-points', handleCityAreaLeave);
        }
      };
    };

    // Run setup with retry logic to handle timing issues during map animations
    let cleanup: (() => void) | undefined;
    let retryTimeout: NodeJS.Timeout | undefined;
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

    // Run setup immediately
    attemptSetup();

    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
      cleanup?.();
      // Note: Don't remove layers here - they should persist until setupClustering
      // runs again with new data. Removing them here causes a flash.
    };
  }, [shopIdsString, mapReady, map, effectiveTheme, expandedCityAreaId]);

  // Update selected logo badge styling
  useEffect(() => {
    if (!map) return;

    const selectedId = selectedShop?.documentId || null;

    // Update all badges - selected one gets highlight
    logoBadges.current.forEach((marker, id) => {
      const el = marker.getElement();
      const isSelected = id === selectedId;

      updateLogoBadgeStyle(el, isSelected);

      // Keep all badges at full opacity, no grayscale
      el.style.filter = 'none';
      el.style.opacity = '1';
    });

    selectedMarkerRef.current = selectedId;
  }, [selectedShop, map]);
}
