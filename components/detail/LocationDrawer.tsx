'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { Location, Shop, Event } from '@/lib/types';
import { getMediaUrl } from '@/lib/utils';
import Image from 'next/image';
import { StarRating } from '@/components/ui/StarRating';
import { CircularCloseButton, StickyDrawerHeader } from '@/components/ui';
import { Award, Calendar, ChevronDown } from 'lucide-react';
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
}

export function LocationDrawer({
  location,
  allShops,
  events = [],
  onClose,
  onShopSelect,
  useWrapper = true,
}: LocationDrawerProps) {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isEventsExpanded, setIsEventsExpanded] = useState(false);
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

  // Reset opacity and collapse events accordion when location changes
  useEffect(() => {
    resetOpacity();
    setIsEventsExpanded(false);
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

      <div className="drawer-content">
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
            className="relative flex items-center justify-between px-6 py-4"
            style={{
              opacity: 1 - stickyHeaderOpacity,
              pointerEvents: stickyHeaderOpacity > 0.5 ? 'none' : 'auto',
            }}
          >
            <span className="text-xs text-white/70 uppercase tracking-wide font-medium">
              City Guide
            </span>
            <CircularCloseButton onPress={onClose} size="md" />
          </div>

          {/* Contained feature image with curved edges */}
          <div className="px-6 pb-6">
            <div className="relative w-full h-[160px] rounded-xl overflow-hidden shadow-lg mb-5">
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

            {/* Location name and country below image */}
            <h2
              className="text-white"
              style={{
                fontFamily: 'PPNeueYork, serif',
                fontSize: '28px',
                fontWeight: 600,
                letterSpacing: '-0.5px',
                lineHeight: 1.1,
              }}
            >
              {currentLocation.name}
            </h2>
            {currentLocation.country?.name && (
              <span
                className="text-white/50 block"
                style={{
                  fontFamily: 'PPNeueYork, serif',
                  fontSize: '28px',
                  letterSpacing: '-0.5px',
                  lineHeight: 1.1,
                }}
              >
                {currentLocation.country.name}
              </span>
            )}
            <p className="text-white text-xs leading-snug mt-3">
              {displayStory}
            </p>
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

          {/* Upcoming Events */}
          {locationEvents.length > 0 && (
            <div>
              {locationEvents.length === 1 ? (
                // Single event - show directly
                <>
                  <div className="flex items-center gap-1.5 mb-3">
                    <Calendar size={14} className="text-text-secondary" />
                    <h3 className="text-base font-medium text-primary">Upcoming Event</h3>
                  </div>
                  <EventCard
                    event={locationEvents[0]}
                    onClick={() => setSelectedEvent(locationEvents[0])}
                    primaryColor={primaryColor}
                  />
                </>
              ) : (
                // Multiple events - use accordion
                <>
                  <button
                    onClick={() => setIsEventsExpanded(!isEventsExpanded)}
                    className="w-full flex items-center justify-between py-2 group"
                  >
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-text-secondary" />
                      <h3 className="text-base font-medium text-primary">
                        {locationEvents.length} Events
                      </h3>
                    </div>
                    <ChevronDown
                      size={18}
                      className={`text-text-secondary transition-transform duration-200 ${
                        isEventsExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isEventsExpanded && (
                    <div className="space-y-1 pt-2">
                      {locationEvents.map((event) => (
                        <EventCard
                          key={event.documentId}
                          event={event}
                          onClick={() => setSelectedEvent(event)}
                          primaryColor={primaryColor}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
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

          {/* Top Choices */}
          {topRecommendationShops.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <Award size={14} className="text-text-secondary" />
                <h3 className="text-base font-medium text-primary">Top Choices</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {topRecommendationShops.map((shop, index) => {
                  const imageUrl = getMediaUrl(shop.featured_image);
                  const logoUrl = getMediaUrl(shop.brand?.logo);

                  return (
                    <button
                      key={shop.documentId}
                      onClick={() => onShopSelect(shop)}
                      className="group relative overflow-hidden rounded-xl transition-all duration-300 hover:shadow-md text-left flex flex-col h-full"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {/* Image section - grows to fill available space */}
                      <div className="relative flex-1 min-h-[100px] overflow-hidden">
                        {imageUrl ? (
                          <Image
                            src={imageUrl}
                            alt={shop.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div
                            className="absolute inset-0"
                            style={{ backgroundColor: primaryColor, opacity: 0.3 }}
                          />
                        )}
                        {/* Brand logo overlay */}
                        {logoUrl && (
                          <div className="absolute bottom-2 left-2 w-8 h-8 rounded-lg overflow-hidden bg-white shadow-md">
                            <Image
                              src={logoUrl}
                              alt={shop.brand?.name || shop.name}
                              width={32}
                              height={32}
                              className="object-cover"
                            />
                          </div>
                        )}
                      </div>

                      {/* Text section with white/tinted background */}
                      <div className="relative p-3 bg-white/95 dark:bg-black/70">
                        <h4 className="font-medium text-primary text-sm leading-tight line-clamp-2">
                          {shop.name}
                        </h4>
                      </div>
                    </button>
                  );
                })}
              </div>
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
    </>
  );

  if (useWrapper) {
    return <div ref={drawerRef} className="drawer">{content}</div>;
  }

  return <div ref={contentRef}>{content}</div>;
}
