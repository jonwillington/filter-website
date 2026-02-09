'use client';

import { ReactNode, useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { LocationCard } from '../sidebar/LocationCard';
import { Switch, Tooltip } from '@heroui/react';
import { ChevronLeft, SlidersHorizontal, HelpCircle, Calendar, UserCheck, Newspaper, Store } from 'lucide-react';
import { Location, Shop, Event, Person, NewsArticle } from '@/lib/types';
import { cn, getShopDisplayName } from '@/lib/utils';
import { getDateGroupLabel } from '@/lib/utils/dateUtils';
import { ShopFilterType } from '../sidebar/Sidebar';
import { EventCard, EventModal } from '@/components/events';
import { PersonCard, PersonModal } from '@/components/people';
import { NewsCard, NewsArticleModal } from '@/components/news';

type SectionTab = 'shops' | 'events' | 'insiders' | 'news';

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

  // Events, People, and News
  events?: Event[];
  people?: Person[];
  newsArticles?: NewsArticle[];

  // Area info
  cityAreaCount?: number;

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
  cityAreaCount = 0,
  events = [],
  people = [],
  newsArticles = [],
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

  // Track whether user has scrolled past the location card
  const cardSentinelRef = useRef<HTMLDivElement>(null);
  const [showStickyHeader, setShowStickyHeader] = useState(false);

  // Modal state for events, people, and news
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [selectedNewsArticle, setSelectedNewsArticle] = useState<NewsArticle | null>(null);

  // Active section tab
  const [activeSection, setActiveSection] = useState<SectionTab>('shops');

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

  // Filter people for current location
  const locationPeople = useMemo(() => {
    if (!selectedLocation) return [];
    return people.filter((person) =>
      person.locations?.some((loc) => loc.documentId === selectedLocation.documentId)
    );
  }, [people, selectedLocation]);

  // Filter news articles for current location (sorted by date, most recent first)
  const locationNews = useMemo(() => {
    if (!selectedLocation) return [];
    return newsArticles
      .filter((article) =>
        article.locations_mentioned?.some((loc) => loc.documentId === selectedLocation.documentId)
      )
      .sort((a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime());
  }, [newsArticles, selectedLocation]);

  // Group news by date for rendering
  const newsGroups = useMemo(() => {
    const groups: { label: string; articles: NewsArticle[] }[] = [];
    for (const article of locationNews) {
      const label = getDateGroupLabel(article.published_date);
      const last = groups[groups.length - 1];
      if (last && last.label === label) {
        last.articles.push(article);
      } else {
        groups.push({ label, articles: [article] });
      }
    }
    return groups;
  }, [locationNews]);

  // Get location primary color for event cards
  const primaryColor = selectedLocation?.primaryColor || selectedLocation?.country?.primaryColor || '#8B6F47';

  // Check if there are any special filters available
  const hasSpecialFilters = filterCounts.topPicks > 0 || filterCounts.working > 0 || filterCounts.interior > 0 || filterCounts.brewing > 0;
  const shouldShowFilter = selectedLocation && onShopFilterChange && filterCounts.all >= 5 && hasSpecialFilters && cityAreaCount > 1 && !selectedCityAreaName;

  // Determine which section tabs to show
  const hasEvents = locationEvents.length > 0;
  const hasInsiders = locationPeople.length > 0;
  const hasNews = locationNews.length > 0;
  const hasAnySectionContent = hasEvents || hasInsiders || hasNews;

  // Reset active section when location changes
  useEffect(() => {
    setActiveSection('shops');
  }, [selectedLocation?.documentId]);

  // Observe the sentinel below the LocationCard to toggle sticky header
  useEffect(() => {
    const sentinel = cardSentinelRef.current;
    const scrollContainer = contentRef.current;
    if (!sentinel || !scrollContainer) {
      setShowStickyHeader(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyHeader(!entry.isIntersecting);
      },
      { root: scrollContainer, threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [selectedLocation, selectedShop, selectedCityAreaName]);

  // Handle transition between list and detail views
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
        contentRef.current.scrollTo({ top: 0, behavior: 'instant' });
      }

      prevSelectedShopRef.current = currentShopId;
    }
  }, [selectedShop]);

  // Handle scroll position when navigating between area list and area detail
  useEffect(() => {
    const currentAreaName = selectedCityAreaName ?? null;
    const prevAreaName = prevSelectedAreaRef.current;

    if (currentAreaName !== prevAreaName) {
      if (currentAreaName && !prevAreaName && contentRef.current) {
        areaScrollPositionRef.current = contentRef.current.scrollTop;
      }

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

  const handleByAreaClick = useCallback(() => {
    if (onShopFilterChange) onShopFilterChange('all');
    if (selectedCityAreaName && onBackToAreaList) onBackToAreaList();
  }, [onShopFilterChange, selectedCityAreaName, onBackToAreaList]);

  // Show controls unless viewing shop detail or first time visitor
  // Keep visible during area drill-down so tabs stay visible
  const showControls = !selectedShop && !isFirstTimeVisitor;
  const showLocationCard = showControls && selectedLocation && onOpenCityGuide && !selectedCityAreaName;

  // Section tabs visible when location selected, hidden during shop detail, first-time visitor, or area drill-down
  const showSectionTabs = showControls && selectedLocation && hasAnySectionContent && !selectedCityAreaName;

  // Label for the "all" filter
  const allFilterLabel = cityAreaCount > 1 ? 'By Area' : 'All Shops';

  return (
    <div className="left-panel">
      {/* Condensed sticky header — appears when scrolled past the location card */}
      {showLocationCard && (
        <div
          className="absolute top-0 left-0 right-0 z-20 flex items-center px-4 py-3 border-b border-border-default"
          style={{
            background: 'var(--surface-warm)',
            opacity: showStickyHeader ? 1 : 0,
            transform: showStickyHeader ? 'translateY(0)' : 'translateY(-4px)',
            transition: 'opacity 0.2s ease-out, transform 0.2s ease-out',
            pointerEvents: showStickyHeader ? 'auto' : 'none',
          }}
        >
          <span className="text-base font-medium text-primary leading-tight">{selectedLocation.name}</span>
        </div>
      )}

      {/* Back button for city area — stays fixed outside scroll */}
      {selectedCityAreaName && onBackToAreaList && !selectedShop && (
        <div className="flex-shrink-0 px-4 py-4 border-b border-border-default">
          <button
            onClick={onBackToAreaList}
            className="flex items-center gap-1 text-accent hover:text-accent/80 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-base font-medium text-primary leading-tight">{selectedCityAreaName}</span>
          </button>
        </div>
      )}

      {/* Back button for shop detail — stays fixed outside scroll */}
      {selectedShop && onBack && (
        <div className="flex-shrink-0 px-4 py-4 border-b border-border-default">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-accent hover:text-accent/80 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-base font-medium text-primary leading-tight">
              {previousShop ? getShopDisplayName(previousShop) : 'Back'}
            </span>
          </button>
        </div>
      )}

      {/* Fully scrollable content area */}
      <div className="relative flex-1 min-h-0">
        <div
          ref={contentRef}
          className={cn(
            'left-panel-content transition-opacity duration-200 h-full',
            isTransitioning && 'opacity-0'
          )}
        >
          {/* Location card — scrolls with content */}
          {showLocationCard && (
            <>
              <LocationCard
                location={selectedLocation}
                onReadCityGuide={onOpenCityGuide}
              />
              {/* Sentinel — when this scrolls out of view, sticky header appears */}
              <div ref={cardSentinelRef} className="h-0" />
            </>
          )}

          {/* Section tabs — Shops, Events, Insiders, News */}
          {showSectionTabs && (
            <div className="px-4 py-3 border-b border-border-default">
              <div className="flex gap-2 flex-wrap">
                {/* Shops tab — always shown */}
                <button
                  onClick={() => setActiveSection('shops')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border"
                  style={activeSection === 'shops'
                    ? { backgroundColor: primaryColor, color: '#fff', borderColor: primaryColor }
                    : { color: primaryColor, borderColor: `${primaryColor}40`, backgroundColor: `${primaryColor}10` }
                  }
                >
                  <Store className="w-3.5 h-3.5" />
                  Shops
                </button>
                {hasEvents && (
                  <button
                    onClick={() => setActiveSection('events')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border"
                    style={activeSection === 'events'
                      ? { backgroundColor: primaryColor, color: '#fff', borderColor: primaryColor }
                      : { color: primaryColor, borderColor: `${primaryColor}40`, backgroundColor: `${primaryColor}10` }
                    }
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Events
                  </button>
                )}
                {hasInsiders && (
                  <button
                    onClick={() => setActiveSection('insiders')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border"
                    style={activeSection === 'insiders'
                      ? { backgroundColor: primaryColor, color: '#fff', borderColor: primaryColor }
                      : { color: primaryColor, borderColor: `${primaryColor}40`, backgroundColor: `${primaryColor}10` }
                    }
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Insiders
                  </button>
                )}
                {hasNews && (
                  <button
                    onClick={() => setActiveSection('news')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border"
                    style={activeSection === 'news'
                      ? { backgroundColor: primaryColor, color: '#fff', borderColor: primaryColor }
                      : { color: primaryColor, borderColor: `${primaryColor}40`, backgroundColor: `${primaryColor}10` }
                    }
                  >
                    <Newspaper className="w-3.5 h-3.5" />
                    News
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Shops section: sub-filters + apply my filters + children */}
          {activeSection === 'shops' && (
            <>
              {/* Controls section - hidden when viewing shop detail, first time visitor, or area drill-down */}
              {showControls && selectedLocation && !selectedCityAreaName && (
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
                          onClick={() => option.key === 'all' ? handleByAreaClick() : handleFilterChange(option.key)}
                          className={cn(
                            'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                            shopFilter === option.key
                              ? 'bg-contrastBlock text-contrastText'
                              : 'bg-white dark:bg-white/10 text-text-secondary border border-border-default hover:border-text-secondary'
                          )}
                        >
                          {option.key === 'all' ? allFilterLabel : option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Shop list / detail content */}
              {children}
            </>
          )}

          {/* Events section */}
          {activeSection === 'events' && locationEvents.length > 0 && (
            <div className="rounded-xl border border-border-default overflow-hidden bg-surface mx-4 mt-3">
              <div className="divide-y divide-border-default">
                {locationEvents.map((event) => (
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

          {/* Insiders section */}
          {activeSection === 'insiders' && locationPeople.length > 0 && (
            <div className="rounded-xl border border-border-default overflow-hidden bg-surface mx-4 mt-3">
              <div className="divide-y divide-border-default">
                {locationPeople.map((person) => (
                  <PersonCard
                    key={person.documentId}
                    person={person}
                    onClick={() => setSelectedPerson(person)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* News section */}
          {activeSection === 'news' && locationNews.length > 0 && (
            <div className="px-4 pt-3 pb-2">
              {newsGroups.map((group, gi) => (
                <div key={group.label} className={gi > 0 ? 'mt-4' : ''}>
                  <span className="text-[11px] font-normal text-text-secondary/30 uppercase tracking-widest mb-2 block">
                    {group.label}
                  </span>
                  <div className="space-y-2">
                    {group.articles.map((article) => (
                      <NewsCard
                        key={article.documentId}
                        article={article}
                        onClick={() => setSelectedNewsArticle(article)}
                        primaryColor={primaryColor}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Event Modal */}
      <EventModal
        event={selectedEvent}
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        primaryColor={primaryColor}
      />

      {/* Person Modal */}
      <PersonModal
        person={selectedPerson}
        isOpen={!!selectedPerson}
        onClose={() => setSelectedPerson(null)}
        onShopSelect={onShopSelect ? (shop) => {
          setSelectedPerson(null);
          onShopSelect(shop);
        } : undefined}
      />

      {/* News Article Modal */}
      <NewsArticleModal
        article={selectedNewsArticle}
        isOpen={!!selectedNewsArticle}
        onClose={() => setSelectedNewsArticle(null)}
        onShopSelect={onShopSelect ? (shop) => {
          setSelectedNewsArticle(null);
          onShopSelect(shop);
        } : undefined}
      />
    </div>
  );
}
