'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { Location, Shop, Event } from '@/lib/types';
import { cn, getMediaUrl, getShopDisplayName } from '@/lib/utils';
import Image from 'next/image';
import { StarRating } from '@/components/ui/StarRating';
import { CircularCloseButton, StickyDrawerHeader } from '@/components/ui';
import { Accordion, AccordionItem } from '@heroui/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useStickyHeaderOpacity } from '@/lib/hooks';
import { getTopRecommendationsForLocation, filterShopsByLocation } from '@/lib/utils/shopFiltering';
import { EventCard, EventModal } from '@/components/events';

interface LocationDrawerProps {
  location: Location;
  allShops: Shop[];
  events?: Event[];
  onClose: () => void;
  onShopSelect: (shop: Shop) => void;
  useWrapper?: boolean;
  allLocations?: Location[];
  onLocationChange?: (location: Location) => void;
}

export function LocationDrawer({
  location,
  allShops,
  events = [],
  onClose,
  onShopSelect,
  useWrapper = true,
  allLocations = [],
  onLocationChange,
}: LocationDrawerProps) {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set(['topShops']));
  const drawerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrollParent, setScrollParent] = useState<HTMLElement | null>(null);

  // Find scrollable parent when not using wrapper
  useEffect(() => {
    if (!useWrapper && contentRef.current) {
      let parent = contentRef.current.parentElement;
      while (parent) {
        const style = getComputedStyle(parent);
        if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
          setScrollParent(parent);
          break;
        }
        parent = parent.parentElement;
      }
    }
  }, [useWrapper]);

  // Create a ref object that points to the scroll container
  const scrollRef = useRef<HTMLDivElement>(null);

  // Update scrollRef to point to the correct scroll container
  useEffect(() => {
    if (useWrapper) {
      (scrollRef as any).current = drawerRef.current;
    } else if (scrollParent) {
      (scrollRef as any).current = scrollParent;
    }
  }, [useWrapper, scrollParent]);

  // Use extracted hook for sticky header opacity
  const { opacity: stickyHeaderOpacity, resetOpacity } = useStickyHeaderOpacity(scrollRef);

  // Reset opacity and reset accordions when location changes (keep topShops open)
  useEffect(() => {
    resetOpacity();
    setExpandedKeys(new Set(['topShops']));
  }, [location.documentId, resetOpacity]);

  // Use location directly - no internal state needed
  const currentLocation = location;

  // Get top recommendation shops using extracted utility
  const topRecommendationShops = useMemo(
    () => getTopRecommendationsForLocation(allShops, currentLocation.documentId, 6),
    [allShops, currentLocation.documentId]
  );

  // Calculate total shops in location using extracted utility
  const totalShops = useMemo(
    () => filterShopsByLocation(allShops, currentLocation).length,
    [allShops, currentLocation]
  );

  // Filter events for current location (only future events, sorted by date)
  const locationEvents = useMemo(() => {
    const now = new Date();
    return events
      .filter((event) => {
        // Filter by city/location
        if (event.city?.documentId !== currentLocation.documentId) {
          return false;
        }
        // Only include future events
        const startDate = new Date(event.start_date);
        return startDate >= now;
      })
      .sort((a, b) => {
        return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
      });
  }, [events, currentLocation.documentId]);

  // Filter locations in same country (sorted alphabetically)
  const countryLocations = useMemo(() => {
    if (!currentLocation.country?.documentId || !allLocations.length) return [];
    return allLocations
      .filter(loc =>
        loc.country?.documentId === currentLocation.country?.documentId &&
        !loc.comingSoon
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allLocations, currentLocation.country?.documentId]);

  // Find current position in country locations
  const currentIndex = countryLocations.findIndex(
    loc => loc.documentId === currentLocation.documentId
  );
  const prevLocation = currentIndex > 0 ? countryLocations[currentIndex - 1] : null;
  const nextLocation = currentIndex < countryLocations.length - 1
    ? countryLocations[currentIndex + 1] : null;

  // Cascade color priority: location-level → country-level → default
  const primaryColor =
    currentLocation.primaryColor ||
    currentLocation.country?.primaryColor ||
    '#8B6F47';

  const backgroundImage = getMediaUrl(currentLocation.background_image);

  // Placeholder story for locations without one
  const placeholderStory = totalShops > 0
    ? `Discover the best specialty coffee in ${currentLocation.name}. Our curated selection features ${totalShops} carefully chosen cafés, from hidden neighbourhood gems to celebrated roasters.`
    : `We're exploring the specialty coffee scene in ${currentLocation.name}. Check back soon for recommendations.`;
  const displayStory = currentLocation.story?.trim() || placeholderStory;

  const content = (
    <>
      {/* Sticky header that fades in on scroll */}
      <StickyDrawerHeader
        title={currentLocation.name}
        opacity={stickyHeaderOpacity}
        onClose={onClose}
      />

      <div className="flex flex-col min-h-full">
      <div className="drawer-content flex-1">
        {/* Beta Banner - sits at very top, header overlaps with curved corners */}
        {currentLocation.beta && (
          <div
            className="relative px-6 pt-3 pb-6 text-sm text-center text-gray-900 animate-fade-in flex items-center justify-center gap-2 overflow-hidden"
            style={{ backgroundColor: primaryColor }}
          >
            {/* White overlay */}
            <div className="absolute inset-0 bg-white/90" />
            <svg className="w-4 h-4 flex-shrink-0 relative" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="relative"><span className="font-medium">This location is in Beta.</span> More shops are being added!</span>
          </div>
        )}

        {/* Header with contained image */}
        <div
          className={`relative location-drawer-header ${currentLocation.beta ? 'rounded-t-2xl -mt-3' : ''}`}
          style={{
            backgroundColor: primaryColor,
          }}
        >
          {/* Top header row with City Guide and close button */}
          <div
            className="relative flex items-center justify-between px-6 py-4 border-b border-white/10"
            style={{
              opacity: 1 - stickyHeaderOpacity,
              pointerEvents: stickyHeaderOpacity > 0.5 ? 'none' : 'auto',
            }}
          >
            <span className="text-xs text-white/70 uppercase tracking-wide font-medium">
              City Guide
            </span>
            <CircularCloseButton onPress={onClose} size="sm" />
          </div>

          {/* Contained feature image */}
          <div className="px-6 pt-4 pb-4">
            <div className="relative w-full h-[140px] rounded-xl overflow-hidden">
              {backgroundImage ? (
                <Image
                  src={backgroundImage}
                  alt={currentLocation.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-white/10" />
              )}
            </div>

            {/* Location name and country in one row */}
            <div className="flex items-baseline gap-1.5 mt-4">
              <h2
                className="text-white"
                style={{
                  fontFamily: 'PPNeueYork, serif',
                  fontSize: '26px',
                  fontWeight: 600,
                  letterSpacing: '-0.5px',
                  lineHeight: 1.1,
                }}
              >
                {currentLocation.name}
              </h2>
              {currentLocation.country?.name && (
                <>
                  <span className="text-white/50" style={{ fontSize: '26px' }}>·</span>
                  <span
                    className="text-white/50"
                    style={{
                      fontFamily: 'PPNeueYork, serif',
                      fontSize: '26px',
                      letterSpacing: '-0.5px',
                      lineHeight: 1.1,
                    }}
                  >
                    {currentLocation.country.name}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div key={currentLocation.documentId} className="p-6 space-y-6 stagger-fade-in">

          {/* Stats row */}
          <div className="flex items-center gap-6 text-sm">
            {/* City Rating */}
            {currentLocation.rating_stars && (
              <div className="flex items-center gap-2">
                <span className="text-text-secondary">Rating</span>
                <StarRating
                  rating={currentLocation.rating_stars}
                  size={14}
                  animate={true}
                  animationDelay={0}
                />
                <span className="font-medium">{currentLocation.rating_stars.toFixed(1)}</span>
              </div>
            )}

            {/* Total Shops */}
            <div className="flex items-center gap-2">
              <span className="text-text-secondary">Shops</span>
              <span className="font-medium">{totalShops}</span>
            </div>
          </div>

          {/* Description */}
          <p className="text-[13px] text-primary leading-snug">
            {displayStory}
          </p>

          {/* Upcoming Events */}
          {locationEvents.length > 0 && (
            <Accordion
              selectedKeys={expandedKeys}
              onSelectionChange={(keys) => setExpandedKeys(keys as Set<string>)}
              variant="light"
              className="px-0 gap-0"
              itemClasses={{
                base: 'bg-surface rounded-xl shadow-none overflow-hidden',
                title: 'text-base font-medium text-primary',
                trigger: 'px-4 py-3 data-[open=true]:bg-gray-200 dark:data-[open=true]:bg-white/10 transition-colors',
                content: 'px-4 pb-3 pt-3',
                indicator: 'text-text-secondary',
              }}
            >
              <AccordionItem
                key="events"
                aria-label="Events"
                startContent={
                  <Image
                    src="/coffee-award.png"
                    alt="Events"
                    width={28}
                    height={28}
                    className="w-7 h-7"
                  />
                }
                title={`${locationEvents.length} ${locationEvents.length === 1 ? 'Event' : 'Events'}`}
              >
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
              </AccordionItem>
            </Accordion>
          )}

          {/* Top Choices */}
          {topRecommendationShops.length > 0 && (
            <Accordion
              selectedKeys={expandedKeys}
              onSelectionChange={(keys) => setExpandedKeys(keys as Set<string>)}
              variant="light"
              className="px-0 gap-0"
              itemClasses={{
                base: 'bg-surface rounded-xl shadow-none overflow-hidden',
                title: 'text-base font-medium text-primary',
                trigger: 'px-4 py-3 data-[open=true]:bg-gray-200 dark:data-[open=true]:bg-white/10 transition-colors',
                content: 'px-4 pb-3 pt-3',
                indicator: 'text-text-secondary',
              }}
            >
              <AccordionItem
                key="topShops"
                aria-label="Top Choices"
                startContent={
                  <Image
                    src="/coffee-award.png"
                    alt="Top Choice"
                    width={28}
                    height={28}
                    className="w-7 h-7"
                  />
                }
                title={`${topRecommendationShops.length} Top Shop ${topRecommendationShops.length === 1 ? 'Choice' : 'Choices'}`}
              >
                <div className="divide-y divide-border-default">
                  {topRecommendationShops.map((shop) => {
                    const imageUrl = getMediaUrl(shop.featured_image);
                    const logoUrl = getMediaUrl(shop.brand?.logo);
                    const neighborhoodName = shop.city_area?.name;
                    const displayName = getShopDisplayName(shop);

                    // Get short address as fallback
                    const getShortAddress = (address: string) => {
                      const parts = address.split(',').map(p => p.trim());
                      return parts[0];
                    };
                    const locationLabel = neighborhoodName || (shop.address ? getShortAddress(shop.address) : null);

                    return (
                      <button
                        key={shop.documentId}
                        onClick={() => onShopSelect(shop)}
                        className="w-full text-left transition-all duration-200 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg py-3 group"
                      >
                        <div className="flex items-center gap-3">
                          {/* Brand avatar - far left */}
                          {shop.brand && (
                            logoUrl ? (
                              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 dark:bg-white/10 flex-shrink-0">
                                <Image
                                  src={logoUrl}
                                  alt={shop.brand.name}
                                  width={40}
                                  height={40}
                                  className="object-cover w-full h-full"
                                />
                              </div>
                            ) : (
                              <div
                                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium text-white flex-shrink-0"
                                style={{ backgroundColor: primaryColor }}
                              >
                                {shop.brand.name.charAt(0)}
                              </div>
                            )
                          )}

                          {/* Content - middle */}
                          <div className="flex-1 min-w-0">
                            {/* Shop name */}
                            <h4 className="font-medium text-primary text-[15px] leading-tight line-clamp-2">
                              {displayName}
                            </h4>

                            {/* Location label - city area or short address */}
                            {locationLabel && (
                              <p className="text-sm text-text-secondary line-clamp-1 mt-0.5">
                                {locationLabel}
                              </p>
                            )}
                          </div>

                          {/* Image - far right (always show, with placeholder) */}
                          <div className="relative w-28 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-white/10">
                            {imageUrl ? (
                              <Image
                                src={imageUrl}
                                alt={displayName}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-gray-300 dark:text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </AccordionItem>
            </Accordion>
          )}

          {/* No Shops Message */}
          {totalShops === 0 && (
            <div className="bg-surface border border-border-default rounded-lg p-5">
              <h4 className="text-base font-semibold text-primary mb-2">
                No recommendations yet
              </h4>
              <p className="text-sm text-text-secondary">
                We haven&apos;t found any good specialty coffee shops in {currentLocation.name} yet. Know of one? Let us know!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Location Navigation Footer */}
      {countryLocations.length > 1 && onLocationChange && (
        <div className="border-t border-border-default bg-background px-6 py-3">
          <div className="grid grid-cols-3 items-center">
            {/* Previous */}
            <div className="justify-self-start">
              {prevLocation && (
                <button
                  onClick={() => onLocationChange(prevLocation)}
                  className="flex items-center gap-1 text-sm text-text-secondary hover:text-primary transition-colors"
                >
                  <ChevronLeft size={18} />
                  <span className="max-w-[100px] truncate">{prevLocation.name}</span>
                </button>
              )}
            </div>

            {/* Position indicator */}
            <span className="text-xs text-text-secondary justify-self-center">
              {currentIndex + 1} of {countryLocations.length}
            </span>

            {/* Next */}
            <div className="justify-self-end">
              {nextLocation ? (
                <button
                  onClick={() => onLocationChange(nextLocation)}
                  className="flex items-center gap-1 text-sm text-text-secondary hover:text-primary transition-colors"
                >
                  <span className="max-w-[100px] truncate">{nextLocation.name}</span>
                  <ChevronRight size={18} />
                </button>
              ) : (
                <span className="text-xs text-text-secondary italic">More cities soon!</span>
              )}
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Event Modal */}
      <EventModal
        event={selectedEvent}
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        primaryColor={primaryColor}
      />
    </>
  );

  if (useWrapper) {
    return <div ref={drawerRef} className="drawer">{content}</div>;
  }

  return <div ref={contentRef}>{content}</div>;
}
