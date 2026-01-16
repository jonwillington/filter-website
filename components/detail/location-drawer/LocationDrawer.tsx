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
import { TopChoicesModal } from '@/components/modals/TopChoicesModal';

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
  const [showTopChoicesModal, setShowTopChoicesModal] = useState(false);
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

  // Footer element (absolutely positioned at bottom)
  const footerElement = countryLocations.length > 1 && onLocationChange && (
    <div className="absolute bottom-0 left-0 right-0 border-t border-border-default bg-background px-6 py-3 z-10">
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
  );

  const content = (
    <>
      {/* Sticky header that fades in on scroll */}
      <StickyDrawerHeader
        title={currentLocation.name}
        opacity={stickyHeaderOpacity}
        onClose={onClose}
      />

      {/* Scrollable content area */}
      <div className="drawer-content flex-1 overflow-y-auto">
        {/* Beta Banner */}
        {currentLocation.beta && (
          <div className="px-6 pt-3 pb-3 text-sm text-center text-white/90 animate-fade-in flex items-center justify-center gap-2 border-b border-white/10 bg-purple-600">
            <svg className="w-4 h-4 flex-shrink-0 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span><span className="font-medium">{currentLocation.name} is in BETA.</span> More shops coming soon!</span>
          </div>
        )}

        {/* Top header row with City Guide and close button */}
        <div
          className="relative flex items-center justify-between px-6 py-4"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.07)',
            opacity: 1 - stickyHeaderOpacity,
            pointerEvents: stickyHeaderOpacity > 0.5 ? 'none' : 'auto',
          }}
        >
          <span className="text-xs text-white/60 uppercase tracking-wide font-medium">
            City Guide
          </span>
          <CircularCloseButton onPress={onClose} size="sm" />
        </div>

        {/* Hero section with image and title */}
        <div className="px-6 pt-4">
          {/* Feature image */}
          <div className="relative w-full h-[160px] rounded-xl overflow-hidden">
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

          {/* City name - larger editorial typography */}
          <h2
            className="text-white mt-5"
            style={{
              fontFamily: 'PPNeueYork, serif',
              fontSize: '38px',
              fontWeight: 600,
              letterSpacing: '-1px',
              lineHeight: 1.0,
            }}
          >
            {currentLocation.name}
          </h2>

          {/* Country name */}
          {currentLocation.country?.name && (
            <p
              className="text-white/50 mt-1"
              style={{
                fontFamily: 'PPNeueYork, serif',
                fontSize: '24px',
                letterSpacing: '-0.5px',
                lineHeight: 1.1,
              }}
            >
              {currentLocation.country.name}
            </p>
          )}

          {/* Description */}
          <p className="text-[13px] text-white/75 leading-snug mt-4">
            {displayStory}
          </p>

          {/* Stats row */}
          <div className="flex items-center gap-6 text-sm mt-4 pb-6">
            {/* City Rating */}
            {currentLocation.rating_stars && (
              <div className="flex items-center gap-2">
                <span className="text-white/60">City rating</span>
                <StarRating
                  rating={currentLocation.rating_stars}
                  size={14}
                  animate={true}
                  animationDelay={0}
                />
                <span className="font-medium text-white">{currentLocation.rating_stars.toFixed(1)}</span>
              </div>
            )}

            {/* Total Shops */}
            <div className="flex items-center gap-2">
              <span className="text-white/60">Shops</span>
              <span className="font-medium text-white">{totalShops}</span>
            </div>
          </div>
        </div>

        {/* Content - accordions */}
        <div key={currentLocation.documentId} className={cn("px-6 pb-6 space-y-4 stagger-fade-in", countryLocations.length > 1 && "pb-16")}>

          {/* Upcoming Events */}
          {locationEvents.length > 0 && (
            <Accordion
              selectedKeys={expandedKeys}
              onSelectionChange={(keys) => setExpandedKeys(keys as Set<string>)}
              variant="light"
              className="px-0 gap-0"
              itemClasses={{
                base: 'bg-white/10 rounded-xl shadow-none overflow-hidden',
                title: 'text-base font-medium text-white',
                trigger: 'px-4 py-3 data-[open=true]:bg-white/[0.15] transition-colors',
                content: 'pb-3 pt-3',
                indicator: 'text-white/60',
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
                <div className="divide-y divide-white/10">
                  {locationEvents.map((event) => (
                    <EventCard
                      key={event.documentId}
                      event={event}
                      onClick={() => setSelectedEvent(event)}
                      primaryColor={primaryColor}
                      variant="light"
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
                base: 'bg-white/10 rounded-xl shadow-none overflow-hidden',
                title: 'text-base font-medium text-white',
                trigger: 'px-4 py-3 data-[open=true]:bg-white/[0.15] transition-colors',
                content: 'pb-3 pt-3',
                indicator: 'text-white/60',
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
                <div className="divide-y divide-white/10">
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
                        className="w-full text-left transition-all duration-200 hover:bg-white/5 py-3 px-4 group"
                      >
                        <div className="flex items-center gap-3">
                          {/* Brand avatar - far left */}
                          {shop.brand && (
                            logoUrl ? (
                              <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
                                <Image
                                  src={logoUrl}
                                  alt={shop.brand.name}
                                  width={40}
                                  height={40}
                                  className="object-cover w-full h-full"
                                />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium bg-white/20 text-white flex-shrink-0">
                                {shop.brand.name.charAt(0)}
                              </div>
                            )
                          )}

                          {/* Content - middle */}
                          <div className="flex-1 min-w-0">
                            {/* Shop name */}
                            <h4 className="font-medium text-white text-[15px] leading-tight line-clamp-2">
                              {displayName}
                            </h4>

                            {/* Location label - city area or short address */}
                            {locationLabel && (
                              <p className="text-sm text-white/60 line-clamp-1 mt-0.5">
                                {locationLabel}
                              </p>
                            )}
                          </div>

                          {/* Image - far right (always show, with placeholder) */}
                          <div className="relative w-28 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-white/10">
                            {imageUrl ? (
                              <Image
                                src={imageUrl}
                                alt={displayName}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                {/* Top Choices Explainer */}
                <p className="text-xs text-white/40 leading-tight px-4 pt-3 pb-1">
                  Top Choices are places we have verified for outstanding coffee in {currentLocation.name}.{' '}
                  <button
                    onClick={() => setShowTopChoicesModal(true)}
                    className="text-white/80 hover:text-white transition-colors"
                  >
                    Learn more
                  </button>
                </p>
              </AccordionItem>
            </Accordion>
          )}

          {/* No Shops Message */}
          {totalShops === 0 && (
            <div className="bg-white/10 border border-white/20 rounded-lg p-5">
              <h4 className="text-base font-semibold text-white mb-2">
                No recommendations yet
              </h4>
              <p className="text-sm text-white/70">
                We haven&apos;t found any good specialty coffee shops in {currentLocation.name} yet. Know of one? Let us know!
              </p>
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

      {/* Top Choices Modal */}
      <TopChoicesModal
        isOpen={showTopChoicesModal}
        onClose={() => setShowTopChoicesModal(false)}
      />
    </>
  );

  if (useWrapper) {
    return (
      <div
        ref={drawerRef}
        className="drawer relative flex-1 flex flex-col"
        style={{ backgroundColor: primaryColor }}
      >
        {content}
        {footerElement}
      </div>
    );
  }

  return (
    <div
      ref={contentRef}
      className="relative flex-1 flex flex-col"
      style={{ backgroundColor: primaryColor }}
    >
      {content}
      {footerElement}
    </div>
  );
}
