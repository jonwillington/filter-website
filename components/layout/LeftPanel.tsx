'use client';

import { ReactNode, useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { LocationCard } from '../sidebar/LocationCard';
import { Switch, Tooltip } from '@heroui/react';
import { ChevronLeft, SlidersHorizontal, HelpCircle, Calendar, UserCheck } from 'lucide-react';
import { Location, Shop, Country, Event, Critic } from '@/lib/types';
import { cn, getShopDisplayName } from '@/lib/utils';
import { ShopFilterType } from '../sidebar/Sidebar';
import { EventCard, EventModal } from '@/components/events';
import { CriticCard, CriticModal } from '@/components/critics';

const FILTER_OPTIONS: { key: ShopFilterType; label: string }[] = [
  { key: 'all', label: 'All Shops' },
  { key: 'topPicks', label: 'Top Picks' },
  { key: 'working', label: 'Workspace' },
  { key: 'interior', label: 'Interior' },
  { key: 'brewing', label: 'Excellent Brewing' },
];

interface LeftPanelProps {
  // Location/Controls
  selectedLocation: Location | null;
  unsupportedCountry?: { name: string; code: string } | null;
  isAreaUnsupported?: boolean;
  onOpenCityGuide?: () => void;
  onClearLocation?: () => void;

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
  onShopSelect?: (shop: Shop) => void;

  // Events and Critics
  events?: Event[];
  critics?: Critic[];

  // Content
  children: ReactNode;

  // Loading states
  isLoading?: boolean;
  isFirstTimeVisitor?: boolean;
}

export function LeftPanel({
  selectedLocation,
  unsupportedCountry,
  isAreaUnsupported = false,
  onOpenCityGuide,
  onClearLocation,
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
  onShopSelect,
  events = [],
  critics = [],
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

  // Modal state for events and critics
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedCritic, setSelectedCritic] = useState<Critic | null>(null);

  // Filter events for current location (only future events, sorted by date)
  const locationEvents = useMemo(() => {
    if (!selectedLocation) return [];
    const now = new Date();
    return events
      .filter((event) => {
        if (event.city?.documentId !== selectedLocation.documentId) return false;
        const startDate = new Date(event.start_date);
        return startDate >= now;
      })
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  }, [events, selectedLocation]);

  // Filter critics for current location
  const locationCritics = useMemo(() => {
    if (!selectedLocation) return [];
    return critics.filter((critic) =>
      critic.locations?.some((loc) => loc.documentId === selectedLocation.documentId)
    );
  }, [critics, selectedLocation]);

  // Get location primary color for event cards
  const primaryColor = selectedLocation?.primaryColor || selectedLocation?.country?.primaryColor || '#8B6F47';

  // Check if there are any special filters available
  const hasSpecialFilters = filterCounts.topPicks > 0 || filterCounts.working > 0 || filterCounts.interior > 0 || filterCounts.brewing > 0;
  const shouldShowFilter = selectedLocation && onShopFilterChange && filterCounts.all >= 5 && hasSpecialFilters;

  // Handle transition between list and detail views
  // No fade transition - stagger animation in ShopDetailInline handles the visual transition
  useEffect(() => {
    const currentShopId = selectedShop?.documentId ?? null;
    const prevShopId = prevSelectedShopRef.current;

    if (currentShopId !== prevShopId) {
      // Save scroll position when leaving list view
      if (currentShopId && !prevShopId && contentRef.current) {
        scrollPositionRef.current = contentRef.current.scrollTop;
      }

      // Restore scroll position when returning to list view, or scroll to top for detail
      if (!currentShopId && prevShopId && contentRef.current) {
        contentRef.current.scrollTo({ top: scrollPositionRef.current, behavior: 'instant' });
      } else if (currentShopId && contentRef.current) {
        // Scroll to top when viewing a shop
        contentRef.current.scrollTo({ top: 0, behavior: 'instant' });
      }

      prevSelectedShopRef.current = currentShopId;
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
      {/* Hero location card - shows when a location is selected */}
      {showControls && selectedLocation && onOpenCityGuide && (
        <LocationCard
          location={selectedLocation}
          onReadCityGuide={onOpenCityGuide}
          onBack={onClearLocation}
        />
      )}

      {/* Controls section - hidden when viewing shop detail or first time visitor */}
      {showControls && selectedLocation && (
        <div className="left-panel-controls space-y-3 pb-4 border-b border-border-default">

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
                      : 'bg-white dark:bg-white/10 text-text-secondary border border-border-default hover:border-text-secondary'
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
        <div className="flex-shrink-0 px-4 py-4 border-b border-border-default">
          <button
            onClick={onBackToAreaList}
            className="flex items-center gap-1 text-accent hover:text-accent/80 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-xl font-medium text-primary leading-tight">{selectedCityAreaName}</span>
          </button>
        </div>
      )}

      {/* Back button when viewing shop detail */}
      {selectedShop && onBack && (
        <div className="flex-shrink-0 px-4 py-4 border-b border-border-default">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-accent hover:text-accent/80 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-xl font-medium text-primary leading-tight">
              {previousShop ? getShopDisplayName(previousShop) : 'Back'}
            </span>
          </button>
        </div>
      )}

      {/* Content area with fade transition */}
      <div className="relative flex-1 min-h-0">
        <div
          ref={contentRef}
          className={cn(
            'left-panel-content transition-opacity duration-200 h-full',
            isTransitioning && 'opacity-0'
          )}
        >
          {/* Events and Critics cards - inside scrollable area */}
          {showControls && selectedLocation && (locationEvents.length > 0 || locationCritics.length > 0) && (
            <div className="p-4 space-y-4">
              {/* Events section */}
              {locationEvents.length > 0 && (
                <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-border-default">
                    <Calendar className="w-4 h-4 text-accent" />
                    <span className="text-sm font-medium text-primary">
                      {locationEvents.length} Upcoming {locationEvents.length === 1 ? 'Event' : 'Events'}
                    </span>
                  </div>
                  <div className="divide-y divide-border-default">
                    {locationEvents.slice(0, 3).map((event) => (
                      <EventCard
                        key={event.documentId}
                        event={event}
                        onClick={() => setSelectedEvent(event)}
                        primaryColor={primaryColor}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Critics/Insiders Guide section */}
              {locationCritics.length > 0 && (
                <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-border-default">
                    <UserCheck className="w-4 h-4 text-accent" />
                    <span className="text-sm font-medium text-primary">Insiders Guide</span>
                  </div>
                  <div className="divide-y divide-border-default">
                    {locationCritics.map((critic) => (
                      <CriticCard
                        key={critic.documentId}
                        critic={critic}
                        onClick={() => setSelectedCritic(critic)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {children}
        </div>
      </div>

      {/* Event Modal */}
      <EventModal
        event={selectedEvent}
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        primaryColor={primaryColor}
      />

      {/* Critic Modal */}
      <CriticModal
        critic={selectedCritic}
        isOpen={!!selectedCritic}
        onClose={() => setSelectedCritic(null)}
        onShopSelect={onShopSelect ? (shop) => {
          setSelectedCritic(null);
          onShopSelect(shop);
        } : undefined}
      />
    </div>
  );
}
