'use client';

import { useMemo, useRef, useEffect } from 'react';
import Image from 'next/image';
import { ModalBody } from '@heroui/react';
import { Location, Shop, Event, Person } from '@/lib/types';
import { ResponsiveModal, StickyDrawerHeader } from '@/components/ui';
import { StarRating } from '@/components/ui/StarRating';
import { getMediaUrl } from '@/lib/utils';
import { CircleFlag } from 'react-circle-flags';
import { filterShopsByLocation } from '@/lib/utils/shopFiltering';
import { getStoryText, RenderStory } from '@/lib/utils/storyBlocks';
import { useStickyHeaderOpacity } from '@/lib/hooks';

interface CityGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: Location | null;
  allShops: Shop[];
  events?: Event[];
  people?: Person[];
  onShopSelect: (shop: Shop) => void;
  allLocations?: Location[];
  onLocationChange?: (location: Location) => void;
}

export function CityGuideModal({
  isOpen,
  onClose,
  location,
  allShops,
}: CityGuideModalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { opacity: stickyHeaderOpacity, resetOpacity } = useStickyHeaderOpacity(scrollRef);

  useEffect(() => {
    if (location) resetOpacity();
  }, [location?.documentId, resetOpacity]);

  const backgroundImage = useMemo(() => location ? getMediaUrl(location.background_image) : null, [location]);

  const totalShops = useMemo(
    () => location ? filterShopsByLocation(allShops, location).length : 0,
    [allShops, location]
  );

  const placeholderStory = useMemo(() => {
    if (!location) return '';
    return totalShops > 0
      ? `Discover the best specialty coffee in ${location.name}. Our curated selection features ${totalShops} carefully chosen cafés, from hidden neighbourhood gems to celebrated roasters.`
      : `We're exploring the specialty coffee scene in ${location.name}. Check back soon for recommendations.`;
  }, [location, totalShops]);

  if (!location) return null;

  const storyText = getStoryText(location.story);
  const hasStory = storyText.trim().length > 0;
  const displayHeadline = location.headline?.trim() || `Your guide to specialty coffee in ${location.name}`;

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      hideCloseButton
      modalClassNames={{
        wrapper: 'z-[1100]',
        backdrop: 'z-[1100]',
        base: '!bg-[var(--surface-warm)] overflow-hidden',
      }}
    >
      <ModalBody className="p-0 overflow-hidden flex flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {/* Sticky header */}
          <StickyDrawerHeader
            title={location.name}
            opacity={stickyHeaderOpacity}
            onClose={onClose}
          />

          {/* Hero image */}
          {backgroundImage && (
            <div className="relative w-full h-48">
              <Image
                src={backgroundImage}
                alt={location.name}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
          )}

          {/* Content */}
          <div className="p-8 pt-6">
            {/* City name */}
            <h2 className="text-3xl lg:text-4xl font-medium text-primary leading-tight">
              {location.name}
            </h2>

            {/* Country with flag + stats */}
            <div className="flex items-center gap-4 mt-2">
              {location.country?.name && (
                <div className="flex items-center gap-1.5">
                  {location.country?.code && (
                    <span className="inline-flex w-3.5 h-3.5 flex-shrink-0">
                      <CircleFlag
                        countryCode={location.country.code.toLowerCase()}
                        height={14}
                      />
                    </span>
                  )}
                  <span className="text-sm text-text-secondary">
                    {location.country.name}
                  </span>
                </div>
              )}

              {location.rating_stars && (
                <div className="flex items-center gap-1.5">
                  <StarRating rating={location.rating_stars} size={12} />
                  <span className="text-sm text-text-secondary">{location.rating_stars.toFixed(1)}</span>
                </div>
              )}

              <span className="text-sm text-text-secondary">{totalShops} shops</span>
            </div>

            {/* Statement / headline */}
            <p className="text-lg text-primary font-medium leading-snug mt-6">
              {displayHeadline}
            </p>

            {/* Story author attribution — at top of story */}
            {location.storyAuthor?.name && (
              <div className="mt-4 flex items-center gap-3">
                {getMediaUrl(location.storyAuthor.photo) ? (
                  <Image
                    src={getMediaUrl(location.storyAuthor.photo)!}
                    alt={location.storyAuthor.name}
                    width={28}
                    height={28}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-border-default flex items-center justify-center flex-shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                )}
                <span className="text-sm italic text-text-secondary">
                  Written by {location.storyAuthor.name}
                </span>
              </div>
            )}

            {/* Story */}
            <div className="mt-4 text-sm text-text-secondary leading-relaxed space-y-3">
              {hasStory ? (
                <RenderStory story={location.story} />
              ) : (
                <p>{placeholderStory}</p>
              )}
            </div>
          </div>
        </div>
      </ModalBody>
    </ResponsiveModal>
  );
}
