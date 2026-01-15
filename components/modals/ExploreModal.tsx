'use client';

import { useMemo, useState } from 'react';
import { ModalBody, ScrollShadow, Tooltip } from '@heroui/react';
import { ChevronRight, Calendar } from 'lucide-react';
import Image from 'next/image';
import { Location, Country, Shop, Event } from '@/lib/types';
import { ResponsiveModal, ModalAnnouncementBanner, CircularCloseButton } from '@/components/ui';
import { Check } from 'lucide-react';
import { StarRating } from '@/components/ui/StarRating';
import { EventModal } from '@/components/events';
import { cn, getMediaUrl } from '@/lib/utils';
import { formatEventTime } from '@/lib/utils/eventDateUtils';
import { format } from 'date-fns';

type ViewMode = 'region' | 'rating' | 'events';
type SortDirection = 'best' | 'worst';

interface ExploreModalProps {
  isOpen: boolean;
  onClose: () => void;
  locations: Location[];
  countries?: Country[];
  allShops?: Shop[];
  events?: Event[];
  onLocationSelect: (location: Location) => void;
}

// Region display order
const REGION_ORDER = [
  'Europe',
  'Asia',
  'North America',
  'Central Asia',
  'Oceania',
  'South America',
  'Middle East',
  'Africa',
];

// Get flag URL from country code
const getFlagUrl = (countryCode: string | undefined): string | null => {
  if (!countryCode) return null;
  return `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;
};

interface CountryGroup {
  country: Country;
  locations: Location[];
}

interface RegionGroup {
  region: string;
  countries: CountryGroup[];
}

export function ExploreModal({
  isOpen,
  onClose,
  locations,
  countries = [],
  allShops = [],
  events = [],
  onLocationSelect,
}: ExploreModalProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('region');
  const [sortDirection, setSortDirection] = useState<SortDirection>('best');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Create a map of location documentId -> shop count
  const shopCountByLocation = useMemo(() => {
    const countMap = new Map<string, number>();
    allShops.forEach((shop) => {
      const locationId = shop.location?.documentId;
      if (locationId) {
        countMap.set(locationId, (countMap.get(locationId) || 0) + 1);
      }
    });
    return countMap;
  }, [allShops]);

  // Create maps of country code and name -> country (with region) from the countries prop
  const { countryByCode, countryByName } = useMemo(() => {
    const byCode = new Map<string, Country>();
    const byName = new Map<string, Country>();
    countries.forEach((c) => {
      if (c.code) {
        byCode.set(c.code.toUpperCase(), c);
      }
      if (c.name) {
        byName.set(c.name.toLowerCase(), c);
      }
    });
    return { countryByCode: byCode, countryByName: byName };
  }, [countries]);

  // Group locations by region -> country
  const groupedData = useMemo((): RegionGroup[] => {
    const regionMap: Record<string, Record<string, CountryGroup>> = {};

    locations.forEach((location) => {
      const locationCountry = location.country;
      if (!locationCountry) return;

      // Get the full country data from countries prop (which has region object)
      // Try by code first, then by name
      const fullCountry =
        countryByCode.get(locationCountry.code?.toUpperCase() || '') ||
        countryByName.get(locationCountry.name?.toLowerCase() || '') ||
        locationCountry;

      // Access region.Name from the country object
      const region = fullCountry.region?.Name || 'Other';
      const countryName = fullCountry.name || locationCountry.name;

      if (!regionMap[region]) {
        regionMap[region] = {};
      }
      if (!regionMap[region][countryName]) {
        regionMap[region][countryName] = { country: fullCountry, locations: [] };
      }
      regionMap[region][countryName].locations.push(location);
    });

    // Build ordered result
    const orderedRegions = REGION_ORDER.filter((r) => regionMap[r]);
    const otherRegions = Object.keys(regionMap).filter((r) => !REGION_ORDER.includes(r));
    const allRegions = [...orderedRegions, ...otherRegions];

    return allRegions
      .map((region) => ({
        region,
        countries: Object.values(regionMap[region] || {})
          .sort((a, b) => a.country.name.localeCompare(b.country.name))
          .map((group) => ({
            ...group,
            locations: group.locations.sort((a, b) => {
              // Coming soon locations come last
              if (a.comingSoon && !b.comingSoon) return 1;
              if (!a.comingSoon && b.comingSoon) return -1;
              return a.name.localeCompare(b.name);
            }),
          })),
      }))
      .filter((r) => r.countries.length > 0);
  }, [locations, countryByCode, countryByName]);

  // Locations sorted by rating for the rating view (excludes coming soon)
  const locationsByRating = useMemo(() => {
    const filtered = [...locations].filter((loc) => loc.rating_stars != null && !loc.comingSoon);
    return filtered.sort((a, b) => {
      const diff = (b.rating_stars || 0) - (a.rating_stars || 0);
      return sortDirection === 'best' ? diff : -diff;
    });
  }, [locations, sortDirection]);

  // Events for current year, sorted chronologically
  const eventsThisYear = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return events
      .filter((event) => {
        const eventYear = new Date(event.start_date).getFullYear();
        return eventYear === currentYear;
      })
      .sort(
        (a, b) =>
          new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      );
  }, [events]);

  const handleLocationClick = (location: Location) => {
    onLocationSelect(location);
    onClose();
  };

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      size="4xl"
      modalClassNames={{
        backdrop: 'bg-black/60 backdrop-blur-sm',
        base: 'max-h-[90vh] overflow-hidden bg-[#5D4A38]',
      }}
      hideCloseButton
    >
      {/* Announcement banner - sits "behind" the main content */}
      <ModalAnnouncementBanner variant="light" icon={<Check className="w-4 h-4" />}>
        1,000+ locations are being added throughout 2026 to Filter
      </ModalAnnouncementBanner>

      {/* Main content wrapper - overlaps the banner with rounded top corners */}
      <div className="bg-background rounded-t-2xl -mt-3 relative flex flex-col min-h-0 flex-1">
        <CircularCloseButton
          onPress={onClose}
          size="sm"
          className="absolute top-3 right-3 z-20"
        />
        {/* Header with filter chips */}
        <div className="sticky top-0 z-10 bg-background rounded-t-2xl border-b border-border-default">
        <div className="px-6 py-5 lg:py-6 space-y-4">
          <h2 className="text-xl lg:text-2xl font-display" style={{ color: 'var(--text)' }}>
            Where to?
          </h2>
          {/* Filter chips */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('region')}
                className={cn(
                  'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
                  viewMode === 'region'
                    ? 'bg-contrastBlock text-contrastText'
                    : 'bg-surface text-text-secondary hover:bg-border-default'
                )}
              >
                By region
              </button>
              <button
                onClick={() => setViewMode('rating')}
                className={cn(
                  'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
                  viewMode === 'rating'
                    ? 'bg-contrastBlock text-contrastText'
                    : 'bg-surface text-text-secondary hover:bg-border-default'
                )}
              >
                By rating
              </button>
              <button
                onClick={() => setViewMode('events')}
                className={cn(
                  'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
                  viewMode === 'events'
                    ? 'bg-contrastBlock text-contrastText'
                    : 'bg-surface text-text-secondary hover:bg-border-default'
                )}
              >
                Events
              </button>
            </div>

            {/* Sort options - only visible in rating view */}
            {viewMode === 'rating' && (
              <div className="flex items-center gap-1 text-sm">
                <span className="text-text-secondary hidden sm:inline">Sort:</span>
                <button
                  onClick={() => setSortDirection('best')}
                  className={cn(
                    'px-3 py-1 rounded-full transition-colors',
                    sortDirection === 'best'
                      ? 'bg-surface text-primary font-medium'
                      : 'text-text-secondary hover:text-primary'
                  )}
                >
                  Best
                </button>
                <button
                  onClick={() => setSortDirection('worst')}
                  className={cn(
                    'px-3 py-1 rounded-full transition-colors',
                    sortDirection === 'worst'
                      ? 'bg-surface text-primary font-medium'
                      : 'text-text-secondary hover:text-primary'
                  )}
                >
                  Worst
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <ModalBody className="p-0">
        <ScrollShadow className="max-h-[75vh]">
          {viewMode === 'region' && (
            <>
              {/* Desktop: 3-column grid with row-aligned regions */}
              <div className="hidden lg:block py-6 px-8">
                {(() => {
                  // Create rows of 3 regions each
                  const rows: (typeof groupedData)[] = [];
                  for (let i = 0; i < groupedData.length; i += 3) {
                    rows.push(groupedData.slice(i, i + 3));
                  }

                  return rows.map((rowRegions, rowIndex) => (
                    <div
                      key={rowIndex}
                      className={cn(
                        'grid grid-cols-3 divide-x divide-gray-200 dark:divide-white/10',
                        rowIndex > 0 && 'mt-8 pt-8 border-t border-gray-200 dark:border-white/10'
                      )}
                    >
                      {/* Render 3 columns, with empty placeholder if fewer regions */}
                      {[0, 1, 2].map((colIndex) => {
                        const regionData = rowRegions[colIndex];
                        return (
                          <div key={colIndex} className="px-6 first:pl-0 last:pr-0">
                            {regionData ? (
                              <>
                                <h3 className="font-display text-lg text-primary mb-4">
                                  {regionData.region}
                                </h3>
                                <div className="space-y-4">
                                  {regionData.countries.map(({ country, locations: locs }) => (
                                    <div key={country.documentId || country.code}>
                                      <div className="flex items-center gap-1.5 mb-1">
                                        {getFlagUrl(country.code) && (
                                          <div className="w-2.5 h-2.5 rounded-full overflow-hidden flex-shrink-0">
                                            <Image
                                              src={getFlagUrl(country.code)!}
                                              alt={country.name}
                                              width={10}
                                              height={10}
                                              className="object-cover w-full h-full"
                                              unoptimized
                                            />
                                          </div>
                                        )}
                                        <span className="text-sm text-text-secondary">
                                          {country.name}
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap gap-x-1 gap-y-0.5">
                                        {locs.map((location, locIdx) => (
                                          <span key={location.documentId} className="inline-flex items-center">
                                            {location.comingSoon ? (
                                              <Tooltip content="Coming soon" placement="top">
                                                <span
                                                  className="text-sm font-medium text-text-secondary cursor-default underline decoration-dotted opacity-50"
                                                >
                                                  {location.name}
                                                </span>
                                              </Tooltip>
                                            ) : (
                                              <button
                                                onClick={() => handleLocationClick(location)}
                                                className="text-sm font-medium text-primary hover:text-accent transition-colors"
                                              >
                                                {location.name}
                                              </button>
                                            )}
                                            {locIdx < locs.length - 1 && (
                                              <span className="text-border-default mx-1">·</span>
                                            )}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ));
                })()}
              </div>

              {/* Mobile: Clean stacked layout */}
              <div className="lg:hidden px-5 py-6">
                {groupedData.map(({ region, countries: regionCountries }, idx) => (
                  <div key={region} className={idx > 0 ? 'mt-6 pt-5 border-t border-border-default' : ''}>
                    <h3 className="font-display text-lg text-primary mb-4">
                      {region}
                    </h3>
                    <div className="space-y-4">
                      {regionCountries.map(({ country, locations: locs }) => (
                        <div key={country.documentId || country.code}>
                          <div className="flex items-center gap-1.5 mb-1">
                            {getFlagUrl(country.code) && (
                              <div className="w-2.5 h-2.5 rounded-full overflow-hidden flex-shrink-0">
                                <Image
                                  src={getFlagUrl(country.code)!}
                                  alt={country.name}
                                  width={10}
                                  height={10}
                                  className="object-cover w-full h-full"
                                  unoptimized
                                />
                              </div>
                            )}
                            <span className="text-sm text-text-secondary">
                              {country.name}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-x-1 gap-y-0.5">
                            {locs.map((location, locIdx) => (
                              <span key={location.documentId} className="inline-flex items-center">
                                {location.comingSoon ? (
                                  <Tooltip content="Coming soon" placement="top">
                                    <span
                                      className="text-sm font-medium text-text-secondary cursor-default underline decoration-dotted opacity-50"
                                    >
                                      {location.name}
                                    </span>
                                  </Tooltip>
                                ) : (
                                  <button
                                    onClick={() => handleLocationClick(location)}
                                    className="text-sm font-medium text-primary hover:text-accent transition-colors"
                                  >
                                    {location.name}
                                  </button>
                                )}
                                {locIdx < locs.length - 1 && (
                                  <span className="text-border-default mx-1">·</span>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {viewMode === 'rating' && (
            /* Rating view - table-like layout */
            <div className="py-2">
              <div>
                {locationsByRating.map((location, index) => {
                  const shopCount = shopCountByLocation.get(location.documentId) || 0;
                  const isComingSoon = location.comingSoon;

                  const rowContent = (
                    <>
                      {/* Rank number */}
                      <span className={cn(
                        "text-sm font-medium w-6 text-right flex-shrink-0",
                        isComingSoon ? "text-border-default/50" : "text-border-default"
                      )}>
                        {index + 1}
                      </span>

                      {/* City name and country */}
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-2">
                          {location.country && getFlagUrl(location.country.code) && (
                            <div className={cn(
                              "w-4 h-4 rounded-full overflow-hidden flex-shrink-0",
                              isComingSoon && "opacity-50"
                            )}>
                              <Image
                                src={getFlagUrl(location.country.code)!}
                                alt={location.country.name}
                                width={16}
                                height={16}
                                className="object-cover w-full h-full"
                                unoptimized
                              />
                            </div>
                          )}
                          <span className={cn(
                            "text-base font-medium transition-colors",
                            isComingSoon
                              ? "text-text-secondary/60"
                              : "text-primary group-hover:text-accent"
                          )}>
                            {location.name}
                          </span>
                          {location.country && (
                            <span className={cn(
                              "text-sm hidden lg:inline",
                              isComingSoon ? "text-text-secondary/50" : "text-text-secondary"
                            )}>
                              {location.country.name}
                            </span>
                          )}
                          {isComingSoon && (
                            <span className="text-xs text-text-secondary/60 italic">
                              Coming soon
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Shop count */}
                      <div className="flex-shrink-0 text-right hidden sm:block">
                        <span className={cn(
                          "text-sm",
                          isComingSoon ? "text-text-secondary/50" : "text-text-secondary"
                        )}>
                          {shopCount} {shopCount === 1 ? 'shop' : 'shops'}
                        </span>
                      </div>

                      {/* Rating - far right */}
                      <div className={cn(
                        "flex-shrink-0 flex items-start gap-2 pt-0.5",
                        isComingSoon && "opacity-50"
                      )}>
                        <StarRating rating={location.rating_stars || 0} size={14} />
                        <span className={cn(
                          "text-sm font-medium w-8",
                          isComingSoon ? "text-text-secondary/60" : "text-primary"
                        )}>
                          {location.rating_stars?.toFixed(1)}
                        </span>
                      </div>

                      {/* Arrow indicator */}
                      <ChevronRight className={cn(
                        "w-4 h-4 flex-shrink-0 transition-colors",
                        isComingSoon
                          ? "text-border-default/50"
                          : "text-border-default group-hover:text-accent"
                      )} />
                    </>
                  );

                  if (isComingSoon) {
                    return (
                      <div
                        key={location.documentId}
                        className="w-full flex items-center gap-4 lg:gap-5 py-3 px-4 lg:px-6 border-b border-border-default last:border-b-0 cursor-default"
                      >
                        {rowContent}
                      </div>
                    );
                  }

                  return (
                    <button
                      key={location.documentId}
                      onClick={() => handleLocationClick(location)}
                      className="group w-full flex items-center gap-4 lg:gap-5 py-3 px-4 lg:px-6 transition-colors hover:bg-surface border-b border-border-default last:border-b-0"
                    >
                      {rowContent}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === 'events' && (
            <div className="py-2">
              {eventsThisYear.length === 0 ? (
                <div className="text-center py-12 text-text-secondary">
                  No events scheduled for {new Date().getFullYear()}
                </div>
              ) : (
                <div>
                  {eventsThisYear.map((event) => {
                    const imageUrl = getMediaUrl(event.image);
                    const startDate = new Date(event.start_date);
                    const monthLabel = format(startDate, 'MMM').toUpperCase();
                    const dayLabel = format(startDate, 'd');
                    const timeLabel = formatEventTime(event.start_date);
                    const eventCity = event.city;
                    const countryCode = eventCity?.country?.code;

                    return (
                      <button
                        key={event.documentId}
                        onClick={() => setSelectedEvent(event)}
                        className="group w-full flex items-center gap-4 py-3 px-4 lg:px-6 transition-colors hover:bg-surface border-b border-border-default last:border-b-0"
                      >
                        {/* Date column - calendar style */}
                        <div className="w-12 flex-shrink-0 text-center">
                          <div className="text-xs font-medium text-accent uppercase tracking-wide">
                            {monthLabel}
                          </div>
                          <div className="text-2xl font-semibold text-primary leading-tight">
                            {dayLabel}
                          </div>
                        </div>

                        {/* Event details */}
                        <div className="flex-1 min-w-0 text-left">
                          <h4 className="font-medium text-primary text-base leading-tight line-clamp-2 group-hover:text-accent transition-colors">
                            {event.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-1 text-sm text-text-secondary">
                            <span>{timeLabel}</span>
                          </div>
                          {eventCity && (
                            <div className="flex items-center gap-1.5 mt-1">
                              {countryCode && getFlagUrl(countryCode) && (
                                <div className="w-4 h-4 rounded-full overflow-hidden flex-shrink-0">
                                  <Image
                                    src={getFlagUrl(countryCode)!}
                                    alt={eventCity.country?.name || ''}
                                    width={16}
                                    height={16}
                                    className="object-cover w-full h-full"
                                    unoptimized
                                  />
                                </div>
                              )}
                              <span className="text-sm text-text-secondary">
                                {eventCity.name}
                                {eventCity.country && `, ${eventCity.country.name}`}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Event image - right side (banner format) */}
                        <div className="relative w-24 h-14 lg:w-32 lg:h-20 flex-shrink-0 rounded-lg overflow-hidden bg-surface">
                          {imageUrl ? (
                            <Image
                              src={imageUrl}
                              alt={event.name}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Calendar className="w-6 h-6 text-text-secondary" />
                            </div>
                          )}
                        </div>

                        {/* Arrow indicator */}
                        <ChevronRight className="w-4 h-4 flex-shrink-0 text-border-default group-hover:text-accent transition-colors" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </ScrollShadow>
      </ModalBody>
      </div>

      <EventModal
        event={selectedEvent}
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </ResponsiveModal>
  );
}

