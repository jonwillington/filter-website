'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { Location, Shop } from '@/lib/types';
import { getMediaUrl } from '@/lib/utils';
import Image from 'next/image';
import { StarRating } from '@/components/ui/StarRating';
import { CircularCloseButton, StickyDrawerHeader } from '@/components/ui';
import { useStickyHeaderOpacity } from '@/lib/hooks';
import { getTopRecommendationsForLocation, filterShopsByLocation } from '@/lib/utils/shopFiltering';

interface LocationDrawerProps {
  location: Location;
  allShops: Shop[];
  onClose: () => void;
  onShopSelect: (shop: Shop) => void;
  useWrapper?: boolean;
}

export function LocationDrawer({
  location,
  allShops,
  onClose,
  onShopSelect,
  useWrapper = true,
}: LocationDrawerProps) {
  const [storyExpanded, setStoryExpanded] = useState(false);
  const [storyTruncated, setStoryTruncated] = useState(false);
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

  // Reset story state when location changes
  useEffect(() => {
    setStoryExpanded(false);
    setStoryTruncated(false);
    resetOpacity();
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

  // Cascade color priority: location-level → country-level → default
  const primaryColor =
    currentLocation.primaryColor ||
    currentLocation.country?.primaryColor ||
    '#8B6F47';

  const backgroundImage = getMediaUrl(currentLocation.background_image);

  const content = (
    <>
      {/* Sticky header that fades in on scroll */}
      <StickyDrawerHeader
        title={currentLocation.name}
        opacity={stickyHeaderOpacity}
        onClose={onClose}
      />

      <div className="drawer-content">
        {/* Header with contained image */}
        <div
          className="relative location-drawer-header"
          style={{
            backgroundColor: primaryColor,
          }}
        >
          {/* Top header row with City Guide and close button */}
          <div
            className="relative flex items-center justify-between px-4 py-3 border-b border-white/10"
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

          {/* Contained feature image with curved edges */}
          <div className="px-4 pt-4 pb-5">
            <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden shadow-lg mb-5">
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
                fontFamily: 'Refrankt, serif',
                fontSize: '28px',
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
                  fontFamily: 'Refrankt, serif',
                  fontSize: '28px',
                  letterSpacing: '-0.5px',
                  lineHeight: 1.1,
                }}
              >
                {currentLocation.country.name}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Beta Banner */}
          {currentLocation.beta && (
            <div className="bg-surface border border-border-default rounded-lg p-4 flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg
                  className="w-5 h-5 text-accent"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-primary mb-1">
                  This location is in beta
                </h4>
                <p className="text-sm text-text-secondary">
                  More shops are currently being added
                </p>
              </div>
            </div>
          )}

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

          {/* Story */}
          {currentLocation.story && (
            <div>
              <div className="relative">
                <p
                  className="text-primary leading-relaxed whitespace-pre-line"
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: storyExpanded ? 'unset' : 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: storyExpanded ? 'visible' : 'hidden',
                  }}
                  ref={(el) => {
                    if (el && !storyExpanded && !storyTruncated) {
                      const isTruncated = el.scrollHeight > el.clientHeight;
                      if (isTruncated) setStoryTruncated(true);
                    }
                  }}
                >
                  {currentLocation.story.trim()}
                </p>
                {storyTruncated && !storyExpanded && (
                  <button
                    onClick={() => setStoryExpanded(true)}
                    className="text-accent font-medium text-sm mt-2 hover:underline"
                  >
                    Read more
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Top Choices */}
          {topRecommendationShops.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3">Top Choices</h3>
              <div className="grid grid-cols-2 gap-3">
                {topRecommendationShops.map((shop, index) => {
                  const imageUrl = getMediaUrl(shop.featured_image);
                  const logoUrl = getMediaUrl(shop.brand?.logo);

                  return (
                    <button
                      key={shop.documentId}
                      onClick={() => onShopSelect(shop)}
                      className="group relative overflow-hidden bg-surface aspect-[4/3] hover:brightness-110 transition-all duration-300 rounded-xl border border-border-default"
                    >
                      {imageUrl && (
                        <Image
                          src={imageUrl}
                          alt={shop.name}
                          fill
                          className="object-cover"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-3 text-left">
                        {logoUrl && (
                          <div className="w-7 h-7 rounded-md overflow-hidden bg-background mb-2 shadow-sm">
                            <Image
                              src={logoUrl}
                              alt={shop.brand?.name || shop.name}
                              width={28}
                              height={28}
                              className="object-cover"
                            />
                          </div>
                        )}
                        <h4 className="font-bold text-white text-sm leading-tight line-clamp-2">
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
    </>
  );

  if (useWrapper) {
    return <div ref={drawerRef} className="drawer">{content}</div>;
  }

  return <div ref={contentRef}>{content}</div>;
}
