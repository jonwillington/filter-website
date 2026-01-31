'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Shop } from '@/lib/types';
import { ShopCard } from './ShopCard';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getShopDisplayName } from '@/lib/utils';
import { useVirtualizer } from '@tanstack/react-virtual';

// Check if shop is a top/area recommendation
function isTopRecommendation(shop: Shop): boolean {
  const anyShop = shop as any;
  return anyShop.cityAreaRec === true ||
         anyShop.city_area_rec === true ||
         anyShop.cityarearec === true;
}

// Sort shops: top recommendations first, then alphabetically by name
function sortShops(shops: Shop[]): Shop[] {
  return [...shops].sort((a, b) => {
    const aIsTop = isTopRecommendation(a);
    const bIsTop = isTopRecommendation(b);

    // Top recommendations first
    if (aIsTop && !bIsTop) return -1;
    if (!aIsTop && bIsTop) return 1;

    // Then alphabetically by display name
    const aName = getShopDisplayName(a);
    const bName = getShopDisplayName(b);
    return aName.localeCompare(bName);
  });
}

interface ShopListProps {
  shops: Shop[];
  selectedShop: Shop | null;
  onShopSelect: (shop: Shop) => void;
  isLoading?: boolean;
  isFiltered?: boolean;
  shopMatchInfo?: Map<string, string[]>;
  onCityAreaExpand?: (cityAreaId: string | null) => void;
}

interface AreaWithGroup {
  name: string;
  documentId: string;
  group: string | null;
  shops: Shop[];
}

export function ShopList({
  shops,
  selectedShop,
  onShopSelect,
  isLoading,
  isFiltered = false,
  shopMatchInfo,
  onCityAreaExpand,
}: ShopListProps) {
  // Track filter state to force re-animation when filter changes
  const [animationKey, setAnimationKey] = useState(0);
  // Track which city area is currently expanded (only one at a time)
  const [expandedAreaId, setExpandedAreaId] = useState<string | null>(null);
  // Track areas that user has manually collapsed (to prevent auto-expand from overriding)
  const [manuallyCollapsed, setManuallyCollapsed] = useState<Set<string>>(new Set());
  // Track previous selected shop to detect changes
  const prevSelectedShopRef = useRef<string | null>(null);

  useEffect(() => {
    // Increment key when filter changes to trigger re-animation
    setAnimationKey(prev => prev + 1);
  }, [isFiltered]);

  // Handle city area expansion - only one at a time
  const handleAreaExpand = (areaId: string, isExpanding: boolean) => {
    console.log('[ShopList] handleAreaExpand:', { areaId, isExpanding, currentExpandedAreaId: expandedAreaId });
    if (isExpanding) {
      setExpandedAreaId(areaId);
      // Remove from manually collapsed when user explicitly expands
      setManuallyCollapsed(prev => {
        const next = new Set(prev);
        next.delete(areaId);
        return next;
      });
      // Don't highlight map boundary for "Other" (shops without a city area)
      onCityAreaExpand?.(areaId === '__other__' ? null : areaId);
    } else {
      // Track that user manually collapsed this area
      setManuallyCollapsed(prev => new Set(prev).add(areaId));
      if (expandedAreaId === areaId) {
        // Only clear if this area was the expanded one
        setExpandedAreaId(null);
        onCityAreaExpand?.(null);
      }
    }
  };

  // Group shops by area, preserving the group info and documentId
  const areasWithGroups = useMemo(() => {
    const areaMap = new Map<string, AreaWithGroup>();

    shops.forEach((shop) => {
      const cityArea = shop.city_area ?? shop.cityArea;
      const areaName = cityArea?.name ?? 'Other';
      // Use a special identifier for "Other" so it can be toggled like other areas
      const documentId = cityArea?.documentId ?? '__other__';
      const group = cityArea?.group ?? null;

      if (!areaMap.has(areaName)) {
        areaMap.set(areaName, { name: areaName, documentId, group, shops: [] });
      }
      areaMap.get(areaName)!.shops.push(shop);
    });

    return Array.from(areaMap.values());
  }, [shops]);

  // Auto-expand the area containing the selected shop (when selection changes)
  useEffect(() => {
    const currentSelectedId = selectedShop?.documentId ?? null;
    const prevSelectedId = prevSelectedShopRef.current;

    // Only act when selection actually changes
    if (currentSelectedId !== prevSelectedId) {
      prevSelectedShopRef.current = currentSelectedId;

      if (selectedShop) {
        // Find which area contains the selected shop
        const cityArea = selectedShop.city_area ?? (selectedShop as any).cityArea;
        const areaId = cityArea?.documentId ?? '__other__';

        // Only auto-expand if user hasn't manually collapsed this area
        if (!manuallyCollapsed.has(areaId)) {
          setExpandedAreaId(areaId);
          onCityAreaExpand?.(areaId === '__other__' ? null : areaId);
        }
      }
    }
  }, [selectedShop, manuallyCollapsed, onCityAreaExpand]);

  // Group areas by their group field
  const areasByGroup = useMemo(() => {
    const groupMap = new Map<string, AreaWithGroup[]>();

    areasWithGroups.forEach((area) => {
      const groupName = area.group || '';
      if (!groupMap.has(groupName)) {
        groupMap.set(groupName, []);
      }
      groupMap.get(groupName)!.push(area);
    });

    // Sort areas within each group alphabetically
    groupMap.forEach((areas) => {
      areas.sort((a, b) => a.name.localeCompare(b.name));
    });

    // Sort groups alphabetically, with empty group last
    const sortedGroups = Array.from(groupMap.entries()).sort(([a], [b]) => {
      if (a === '') return 1;
      if (b === '') return -1;
      return a.localeCompare(b);
    });

    return sortedGroups;
  }, [areasWithGroups]);

  // Early return for empty state (after all hooks)
  if (shops.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <div>
          <p className="text-textSecondary mb-2">No coffee shops found</p>
          <p className="text-sm text-textSecondary">
            Try selecting a different location
          </p>
        </div>
      </div>
    );
  }

  // If only one area or filtered, show flat list
  const shouldUseAccordion = areasWithGroups.length > 1 && !isFiltered;

  // Single area or filtered: show flat list
  if (!shouldUseAccordion) {
    const hasMatchInfo = shopMatchInfo && shopMatchInfo.size > 0;
    // Only show header when filtered or has match info, not for plain "All shops"
    const showHeader = hasMatchInfo || isFiltered;

    // Sort and split into recommended vs regular shops
    const sortedShops = sortShops(shops);
    const recommendedShops = sortedShops.filter(isTopRecommendation);
    const regularShops = sortedShops.filter(shop => !isTopRecommendation(shop));

    // Use virtualization for large lists (50+ shops), regular rendering for smaller lists
    const useVirtualization = shops.length >= 50;

    if (useVirtualization) {
      return (
        <VirtualizedShopList
          shops={sortedShops}
          selectedShop={selectedShop}
          onShopSelect={onShopSelect}
          isLoading={isLoading}
          shopMatchInfo={shopMatchInfo}
          showHeader={showHeader}
          hasMatchInfo={hasMatchInfo ?? false}
        />
      );
    }

    return (
      <div
        className="transition-opacity duration-300"
        style={{ opacity: isLoading ? 0.4 : 1 }}
      >
        {showHeader && (
          <div className="area-header">
            <h3 className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
              {hasMatchInfo ? `${shops.length} matching shops` : `${shops.length} shops`}
            </h3>
          </div>
        )}
        <div className="py-1">
          {/* Top Recommendations Section */}
          {recommendedShops.length > 0 && (
            <RecommendedShopsSection
              shops={recommendedShops}
              selectedShop={selectedShop}
              onShopSelect={onShopSelect}
              isLoading={isLoading}
              shopMatchInfo={shopMatchInfo}
              animationKey={animationKey}
            />
          )}
          {/* Regular Shops */}
          <AnimatePresence mode="popLayout" initial={false}>
            {regularShops.map((shop, index) => (
              <motion.div
                key={shop.documentId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{
                  duration: 0.3,
                  delay: index * 0.03,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
              >
                <ShopCard
                  shop={shop}
                  isSelected={selectedShop?.documentId === shop.documentId}
                  onClick={() => onShopSelect(shop)}
                  disabled={isLoading}
                  matchedFilters={shopMatchInfo?.get(shop.documentId)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // If fewer than 10 areas, show simple alphabetical list without group headers
  const useSimpleList = areasWithGroups.length < 10;

  if (useSimpleList) {
    // Sort areas alphabetically
    const sortedAreas = [...areasWithGroups].sort((a, b) => a.name.localeCompare(b.name));

    return (
      <div
        className="transition-opacity duration-300"
        style={{ opacity: isLoading ? 0.4 : 1 }}
      >
        {sortedAreas.map((area) => (
          <AreaSection
            key={area.name}
            areaName={area.name}
            areaDocumentId={area.documentId}
            shops={area.shops}
            selectedShop={selectedShop}
            onShopSelect={onShopSelect}
            isLoading={isLoading}
            isFiltered={isFiltered}
            animationKey={animationKey}
            isCurrentlyExpanded={expandedAreaId === area.documentId}
            onAreaExpand={handleAreaExpand}
          />
        ))}
      </div>
    );
  }

  // Multiple areas (6+): show grouped sections
  return (
    <div
      className="transition-opacity duration-300"
      style={{ opacity: isLoading ? 0.4 : 1 }}
    >
      {areasByGroup.map(([groupName, areas], index) => (
        <div key={groupName || 'ungrouped'} className={index > 0 ? 'mt-3' : ''}>
          {groupName && (
            <div className="pt-4 pb-2">
              <h4 className="text-[10px] font-medium text-accent/60 dark:text-accent/50 uppercase tracking-wider">
                {groupName}
              </h4>
            </div>
          )}
          {areas.map((area) => (
            <AreaSection
              key={area.name}
              areaName={area.name}
              areaDocumentId={area.documentId}
              shops={area.shops}
              selectedShop={selectedShop}
              onShopSelect={onShopSelect}
              isLoading={isLoading}
              isFiltered={isFiltered}
              animationKey={animationKey}
              isCurrentlyExpanded={expandedAreaId === area.documentId}
              onAreaExpand={handleAreaExpand}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Recommended shops section with visual distinction
function RecommendedShopsSection({
  shops,
  selectedShop,
  onShopSelect,
  isLoading,
  shopMatchInfo,
  animationKey = 0,
}: {
  shops: Shop[];
  selectedShop: Shop | null;
  onShopSelect: (shop: Shop) => void;
  isLoading?: boolean;
  shopMatchInfo?: Map<string, string[]>;
  animationKey?: number;
}) {
  if (shops.length === 0) return null;

  return (
    <div className="mt-3 mb-2">
      <div className="relative rounded-lg border border-dashed border-accent/30 dark:border-accent/40 bg-surface-warm pb-2 pt-7">
        <span className="absolute top-0 left-0 px-2.5 py-1 text-[9px] font-bold text-white uppercase tracking-wider rounded-br-md rounded-tl-lg" style={{ backgroundColor: '#683b1d' }}>
          Top Choices
        </span>
        <AnimatePresence mode="popLayout" initial={false}>
          {shops.map((shop, index) => (
            <motion.div
              key={`${shop.documentId}-${animationKey}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{
                duration: 0.3,
                delay: index * 0.03,
                ease: [0.25, 0.1, 0.25, 1],
              }}
            >
              <ShopCard
                shop={shop}
                isSelected={selectedShop?.documentId === shop.documentId}
                onClick={() => onShopSelect(shop)}
                disabled={isLoading}
                matchedFilters={shopMatchInfo?.get(shop.documentId)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Virtualized shop list for large lists (50+ items)
function VirtualizedShopList({
  shops,
  selectedShop,
  onShopSelect,
  isLoading,
  shopMatchInfo,
  showHeader,
  hasMatchInfo,
}: {
  shops: Shop[];
  selectedShop: Shop | null;
  onShopSelect: (shop: Shop) => void;
  isLoading?: boolean;
  shopMatchInfo?: Map<string, string[]>;
  showHeader: boolean;
  hasMatchInfo: boolean;
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Estimated row height for shop cards (adjust if needed)
  const ESTIMATED_ROW_HEIGHT = 76;
  const OVERSCAN = 5;

  const virtualizer = useVirtualizer({
    count: shops.length,
    getScrollElement: () => {
      // Find the scrollable sidebar container (.sidebar-content has overflow-y: auto)
      return parentRef.current?.closest('.sidebar-content') as HTMLElement | null;
    },
    estimateSize: useCallback(() => ESTIMATED_ROW_HEIGHT, []),
    overscan: OVERSCAN,
  });

  const items = virtualizer.getVirtualItems();

  // Scroll selected shop into view
  useEffect(() => {
    if (selectedShop) {
      const index = shops.findIndex(s => s.documentId === selectedShop.documentId);
      if (index !== -1) {
        virtualizer.scrollToIndex(index, { align: 'center', behavior: 'smooth' });
      }
    }
  }, [selectedShop, shops, virtualizer]);

  return (
    <div
      className="transition-opacity duration-300"
      style={{ opacity: isLoading ? 0.4 : 1 }}
    >
      {showHeader && (
        <div className="area-header">
          <h3 className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
            {hasMatchInfo ? `${shops.length} matching shops` : `${shops.length} shops`}
          </h3>
        </div>
      )}
      <div ref={parentRef} className="py-1">
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {items.map((virtualRow) => {
            const shop = shops[virtualRow.index];
            return (
              <div
                key={shop.documentId}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <ShopCard
                  shop={shop}
                  isSelected={selectedShop?.documentId === shop.documentId}
                  onClick={() => onShopSelect(shop)}
                  disabled={isLoading}
                  matchedFilters={shopMatchInfo?.get(shop.documentId)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Collapsible area section component
function AreaSection({
  areaName,
  areaDocumentId,
  shops,
  selectedShop,
  onShopSelect,
  isLoading,
  isFiltered = false,
  animationKey,
  isCurrentlyExpanded,
  onAreaExpand,
}: {
  areaName: string;
  areaDocumentId: string;
  shops: Shop[];
  selectedShop: Shop | null;
  onShopSelect: (shop: Shop) => void;
  isLoading?: boolean;
  isFiltered?: boolean;
  animationKey: number;
  isCurrentlyExpanded: boolean;
  onAreaExpand: (areaId: string, isExpanding: boolean) => void;
}) {
  // Use parent-controlled expansion state (only one area can be expanded at a time for map highlighting)
  // isFiltered forces all to expand, otherwise respect parent state
  const isExpanded = isCurrentlyExpanded || isFiltered;

  // Sort shops: top recommendations first, then alphabetically
  const sortedShops = useMemo(() => sortShops(shops), [shops]);

  // Split into recommended and regular shops
  const recommendedShops = useMemo(() => sortedShops.filter(isTopRecommendation), [sortedShops]);
  const regularShops = useMemo(() => sortedShops.filter(shop => !isTopRecommendation(shop)), [sortedShops]);

  const toggleExpanded = () => {
    const newExpanded = !isCurrentlyExpanded;
    console.log('[AreaSection] Toggle:', { areaName, areaDocumentId, newExpanded, wasExpanded: isCurrentlyExpanded });

    // Notify parent about expansion change
    onAreaExpand(areaDocumentId, newExpanded);
  };

  return (
    <div className="border-b border-border-default last:border-b-0">
      <button
        onClick={toggleExpanded}
        className={`w-full flex items-center justify-between py-2 transition-colors ${
          isExpanded
            ? 'bg-accent/10 dark:bg-accent/20'
            : 'hover:bg-accent/5 dark:hover:bg-white/5'
        }`}
        style={{ fontFamily: 'PPNeueYork, system-ui, sans-serif' }}
      >
        <span className="text-sm font-medium text-text">{areaName}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-textSecondary">
            {shops.length}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-textSecondary transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </div>
      </button>
      {isExpanded && (
        <div className="pb-1">
          {/* Top Recommendations Section */}
          {recommendedShops.length > 0 && (
            <RecommendedShopsSection
              shops={recommendedShops}
              selectedShop={selectedShop}
              onShopSelect={onShopSelect}
              isLoading={isLoading}
              animationKey={animationKey}
            />
          )}
          {/* Regular Shops */}
          <AnimatePresence mode="popLayout" initial={false}>
            {regularShops.map((shop, index) => (
              <motion.div
                key={`${shop.documentId}-${animationKey}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{
                  duration: 0.3,
                  delay: index * 0.03,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
              >
                <ShopCard
                  shop={shop}
                  isSelected={selectedShop?.documentId === shop.documentId}
                  onClick={() => onShopSelect(shop)}
                  disabled={isLoading}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
