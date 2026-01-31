'use client';

import { ReactNode, useRef, useEffect, useState, useCallback } from 'react';
import { AnimatedGradientHeader } from '../sidebar/AnimatedGradientHeader';
import { LocationCell } from '../sidebar/LocationCell';
import { Switch, Tooltip } from '@heroui/react';
import { ChevronLeft, SlidersHorizontal, HelpCircle, Map } from 'lucide-react';
import { Location, Shop, Country } from '@/lib/types';
import { cn, getShopDisplayName } from '@/lib/utils';
import { ShopFilterType } from '../sidebar/Sidebar';

const FILTER_OPTIONS: { key: ShopFilterType; label: string }[] = [
  { key: 'all', label: 'All Shops' },
  { key: 'topPicks', label: 'Top Picks' },
  { key: 'working', label: 'Great for Working' },
  { key: 'interior', label: 'Beautiful Interior' },
  { key: 'brewing', label: 'Excellent Brewing' },
];

interface LeftPanelProps {
  // Header
  authComponent?: ReactNode;

  // Location/Controls
  selectedLocation: Location | null;
  unsupportedCountry?: { name: string; code: string } | null;
  isAreaUnsupported?: boolean;
  onOpenExploreModal: () => void;

  // City area drill-down navigation
  selectedCityAreaName?: string | null;
  onBackToAreaList?: () => void;

  // Filters
  shopFilter: ShopFilterType;
  onShopFilterChange?: (filter: ShopFilterType) => void;
  filterCounts: Record<ShopFilterType, number>;
  applyMyFilters: boolean;
  onApplyMyFiltersChange?: (value: boolean) => void;
  hasUserFilters: boolean;
  userFilterSummary?: string;

  // Shop detail view
  selectedShop: Shop | null;
  previousShop?: Shop;
  onBack?: () => void;

  // Content
  children: ReactNode;

  // Loading states
  isLoading?: boolean;
  isFirstTimeVisitor?: boolean;
}

export function LeftPanel({
  authComponent,
  selectedLocation,
  unsupportedCountry,
  isAreaUnsupported = false,
  onOpenExploreModal,
  selectedCityAreaName,
  onBackToAreaList,
  shopFilter,
  onShopFilterChange,
  filterCounts,
  applyMyFilters,
  onApplyMyFiltersChange,
  hasUserFilters,
  userFilterSummary,
  selectedShop,
  previousShop,
  onBack,
  children,
  isLoading,
  isFirstTimeVisitor = false,
}: LeftPanelProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);
  const areaScrollPositionRef = useRef<number>(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevSelectedShopRef = useRef<string | null>(null);
  const prevSelectedAreaRef = useRef<string | null>(null);

  // Scroll shadow state
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  // Check scroll position for shadows
  const updateScrollShadows = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    setCanScrollUp(scrollTop > 0);
    setCanScrollDown(scrollTop + clientHeight < scrollHeight - 1);
  }, []);

  // Update shadows on scroll
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    el.addEventListener('scroll', updateScrollShadows);
    // Initial check
    updateScrollShadows();

    // Also check on resize
    const resizeObserver = new ResizeObserver(updateScrollShadows);
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener('scroll', updateScrollShadows);
      resizeObserver.disconnect();
    };
  }, [updateScrollShadows]);

  // Check if there are any special filters available
  const hasSpecialFilters = filterCounts.topPicks > 0 || filterCounts.working > 0 || filterCounts.interior > 0 || filterCounts.brewing > 0;
  const shouldShowFilter = selectedLocation && onShopFilterChange && filterCounts.all >= 5 && hasSpecialFilters;

  // Handle transition between list and detail views
  useEffect(() => {
    const currentShopId = selectedShop?.documentId ?? null;
    const prevShopId = prevSelectedShopRef.current;

    if (currentShopId !== prevShopId) {
      // Save scroll position when leaving list view
      if (currentShopId && !prevShopId && contentRef.current) {
        scrollPositionRef.current = contentRef.current.scrollTop;
      }

      // Trigger fade transition
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setIsTransitioning(false);

        // Restore scroll position when returning to list view
        if (!currentShopId && prevShopId && contentRef.current) {
          contentRef.current.scrollTo({ top: scrollPositionRef.current, behavior: 'instant' });
        } else if (currentShopId && contentRef.current) {
          // Scroll to top when viewing a shop
          contentRef.current.scrollTo({ top: 0, behavior: 'instant' });
        }
      }, 200);

      prevSelectedShopRef.current = currentShopId;
      return () => clearTimeout(timer);
    }
  }, [selectedShop]);

  // Handle scroll position when navigating between area list and area detail
  // No fade transition here - let the shop card stagger animation handle the visual transition
  useEffect(() => {
    const currentAreaName = selectedCityAreaName ?? null;
    const prevAreaName = prevSelectedAreaRef.current;

    if (currentAreaName !== prevAreaName) {
      // Save scroll position when leaving area list
      if (currentAreaName && !prevAreaName && contentRef.current) {
        areaScrollPositionRef.current = contentRef.current.scrollTop;
      }

      // Restore scroll position when returning to area list, or scroll to top for new area
      if (!currentAreaName && prevAreaName && contentRef.current) {
        contentRef.current.scrollTo({ top: areaScrollPositionRef.current, behavior: 'instant' });
      } else if (currentAreaName && contentRef.current) {
        contentRef.current.scrollTo({ top: 0, behavior: 'instant' });
      }

      prevSelectedAreaRef.current = currentAreaName;
    }
  }, [selectedCityAreaName]);

  const handleFilterChange = useCallback((filter: ShopFilterType) => {
    if (onShopFilterChange) onShopFilterChange(filter);
  }, [onShopFilterChange]);

  // Show controls unless viewing shop detail, first time visitor, or viewing shops within a city area
  const showControls = !selectedShop && !isFirstTimeVisitor && !selectedCityAreaName;

  return (
    <div className="left-panel">
      {/* Header with gradient */}
      <div className="left-panel-header">
        <AnimatedGradientHeader>
          <div className="sidebar-header-content">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-white">Filter</h1>
              {authComponent && <div className="auth-in-sidebar">{authComponent}</div>}
            </div>
          </div>
        </AnimatedGradientHeader>
      </div>

      {/* Controls section - hidden when viewing shop detail or first time visitor */}
      {showControls && (
        <div className="left-panel-controls space-y-3">
          <LocationCell
            selectedLocation={selectedLocation}
            unsupportedCountry={unsupportedCountry ?? null}
            isAreaUnsupported={isAreaUnsupported}
            onClick={onOpenExploreModal}
          />

          {/* Apply my filters toggle */}
          {selectedLocation && hasUserFilters && onApplyMyFiltersChange && (
            <div
              className="flex items-center justify-between p-3 rounded-lg"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  Apply my filters
                </span>
                {userFilterSummary && (
                  <Tooltip
                    content={userFilterSummary}
                    placement="bottom"
                    delay={200}
                    classNames={{
                      content: 'text-xs px-3 py-2 bg-[#1A1410] text-[#FAF7F5] max-w-[200px]',
                    }}
                  >
                    <HelpCircle className="w-3.5 h-3.5 cursor-help" style={{ color: 'var(--text-secondary)' }} />
                  </Tooltip>
                )}
              </div>
              <Switch
                isSelected={applyMyFilters}
                onValueChange={onApplyMyFiltersChange}
                size="sm"
                aria-label="Apply my filters"
              />
            </div>
          )}

          {/* Shop filter chips */}
          {shouldShowFilter && !applyMyFilters && (
            <div className="flex flex-wrap gap-2">
              {FILTER_OPTIONS.filter(opt => filterCounts[opt.key] > 0 || opt.key === 'all').map((option) => (
                <button
                  key={option.key}
                  onClick={() => handleFilterChange(option.key)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                    shopFilter === option.key
                      ? 'bg-contrastBlock text-contrastText'
                      : 'bg-surface text-text-secondary hover:bg-border-default'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Back button when viewing shops within a city area */}
      {selectedCityAreaName && onBackToAreaList && !selectedShop && (
        <div className="flex-shrink-0 px-4 py-4">
          <button
            onClick={onBackToAreaList}
            className="flex items-center gap-1 text-accent hover:text-accent/80 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
            <h2 className="text-[2rem] font-medium text-primary leading-tight">{selectedCityAreaName}</h2>
          </button>
        </div>
      )}

      {/* Back button when viewing shop detail */}
      {selectedShop && onBack && (
        <div className="flex-shrink-0 px-4 py-3 border-b border-border-default">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm font-medium text-accent hover:text-accent/80 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{previousShop ? getShopDisplayName(previousShop) : 'Back to list'}</span>
          </button>
        </div>
      )}

      {/* Content area with fade transition and scroll shadows */}
      <div className="relative flex-1 min-h-0">
        {/* Top scroll shadow */}
        <div
          className={cn(
            'absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none transition-opacity duration-200',
            canScrollUp ? 'opacity-100' : 'opacity-0'
          )}
        />

        <div
          ref={contentRef}
          className={cn(
            'left-panel-content transition-opacity duration-200 h-full',
            isTransitioning && 'opacity-0'
          )}
        >
          {children}
        </div>

        {/* Bottom scroll shadow */}
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none transition-opacity duration-200',
            canScrollDown ? 'opacity-100' : 'opacity-0'
          )}
        />
      </div>

    </div>
  );
}
