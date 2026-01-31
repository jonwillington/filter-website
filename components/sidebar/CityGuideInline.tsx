'use client';

import { useMemo } from 'react';
import { Location, Shop, Event, Critic } from '@/lib/types';
import { getMediaUrl, getShopDisplayName } from '@/lib/utils';
import Image from 'next/image';
import { StarRating } from '@/components/ui/StarRating';
import { MapPin, List, ChevronRight } from 'lucide-react';
import { getTopRecommendationsForLocation, filterShopsByLocation } from '@/lib/utils/shopFiltering';

interface CityGuideInlineProps {
  location: Location;
  allShops: Shop[];
  events?: Event[];
  critics?: Critic[];
  onBrowseByArea: () => void;
  onViewAllShops: () => void;
  onShopSelect: (shop: Shop) => void;
  hasMultipleAreas: boolean;
}

// Helper to generate animation style with stagger delay
const staggerStyle = (index: number) => ({ animationDelay: `${index * 50}ms` });

export function CityGuideInline({
  location,
  allShops,
  events = [],
  critics = [],
  onBrowseByArea,
  onViewAllShops,
  onShopSelect,
  hasMultipleAreas,
}: CityGuideInlineProps) {
  // Get top recommendation shops
  const topRecommendationShops = useMemo(
    () => getTopRecommendationsForLocation(allShops, location.documentId, 5),
    [allShops, location.documentId]
  );

  // Calculate total shops in location
  const totalShops = useMemo(
    () => filterShopsByLocation(allShops, location).length,
    [allShops, location]
  );

  // Filter events for current location (only future events)
  const locationEvents = useMemo(() => {
    const now = new Date();
    return events
      .filter((event) => {
        if (event.city?.documentId !== location.documentId) return false;
        const startDate = new Date(event.start_date);
        return startDate >= now;
      })
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  }, [events, location.documentId]);

  // Cascade color priority: location-level → country-level → default
  const primaryColor = location.primaryColor || location.country?.primaryColor || '#8B6F47';
  const backgroundImage = getMediaUrl(location.background_image);

  // Placeholder story for locations without one
  const placeholderStory = totalShops > 0
    ? `Discover the best specialty coffee in ${location.name}. Our curated selection features ${totalShops} carefully chosen cafés.`
    : `We're exploring the specialty coffee scene in ${location.name}. Check back soon for recommendations.`;
  const displayStory = location.story?.trim() || placeholderStory;

  return (
    <div className="relative" key={location.documentId}>
      {/* Hero Section */}
      <div
        className="shop-card-animate"
        style={{ ...staggerStyle(0), backgroundColor: primaryColor }}
      >
        {/* Feature image */}
        <div className="px-5 pt-5">
          <div className="relative w-full h-[140px] rounded-xl overflow-hidden">
            {backgroundImage ? (
              <Image
                src={backgroundImage}
                alt={location.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-white/10" />
            )}
          </div>
        </div>

        {/* City name and info */}
        <div className="px-5 pt-4 pb-5">
          <h2 className="text-[2rem] font-medium text-white leading-tight">
            {location.name}
          </h2>
          {location.country?.name && (
            <p className="text-white/60 text-lg mt-0.5">
              {location.country.name}
            </p>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-4 mt-3 text-sm">
            {location.rating_stars && (
              <div className="flex items-center gap-1.5">
                <StarRating
                  rating={location.rating_stars}
                  size={14}
                  animate={true}
                  animationDelay={0}
                />
                <span className="text-white/80 font-medium">{location.rating_stars.toFixed(1)}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-white/60">
              <span>{totalShops} shops</span>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-white/70 leading-relaxed mt-3 line-clamp-3">
            {displayStory}
          </p>
        </div>
      </div>

      {/* Content section */}
      <div className="px-5 py-5 space-y-4">
        {/* Quick action buttons */}
        <div className="shop-card-animate flex gap-3" style={staggerStyle(1)}>
          {hasMultipleAreas && (
            <button
              onClick={onBrowseByArea}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-contrastBlock text-contrastText font-medium text-sm hover:opacity-90 transition-opacity"
            >
              <MapPin className="w-4 h-4" />
              Browse by Area
            </button>
          )}
          <button
            onClick={onViewAllShops}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-sm transition-colors ${
              hasMultipleAreas
                ? 'bg-surface border border-border-default text-primary hover:bg-border-default'
                : 'bg-contrastBlock text-contrastText hover:opacity-90'
            }`}
          >
            <List className="w-4 h-4" />
            View All Shops
          </button>
        </div>

        {/* Upcoming Events Banner */}
        {locationEvents.length > 0 && (
          <div className="shop-card-animate" style={staggerStyle(2)}>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/30">
              <Image
                src="/coffee-award.png"
                alt="Events"
                width={28}
                height={28}
                className="w-7 h-7"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                  {locationEvents.length} upcoming {locationEvents.length === 1 ? 'event' : 'events'}
                </p>
                <p className="text-xs text-purple-700 dark:text-purple-300 truncate">
                  {locationEvents[0].name}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-purple-400" />
            </div>
          </div>
        )}

        {/* Filter Recommendations */}
        {topRecommendationShops.length > 0 && (
          <div className="shop-card-animate" style={staggerStyle(locationEvents.length > 0 ? 3 : 2)}>
            <div className="flex items-center gap-2 mb-3">
              <Image
                src="/coffee-award.png"
                alt="Filter Recommendation"
                width={20}
                height={20}
                className="w-5 h-5"
              />
              <h3 className="text-base font-medium text-primary">
                Filter Recommendations
              </h3>
            </div>

            <div className="space-y-1">
              {topRecommendationShops.map((shop, index) => {
                const imageUrl = getMediaUrl(shop.featured_image);
                const logoUrl = getMediaUrl(shop.brand?.logo);
                const neighborhoodName = shop.city_area?.name;
                const displayName = getShopDisplayName(shop);

                return (
                  <button
                    key={shop.documentId}
                    onClick={() => onShopSelect(shop)}
                    className="shop-card-animate w-full text-left transition-colors hover:bg-surface rounded-xl py-2.5 px-2 -mx-2 group"
                    style={staggerStyle((locationEvents.length > 0 ? 4 : 3) + index)}
                  >
                    <div className="flex items-center gap-3">
                      {/* Logo */}
                      {logoUrl ? (
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-border-default flex-shrink-0">
                          <Image
                            src={logoUrl}
                            alt={shop.brand?.name || displayName}
                            width={40}
                            height={40}
                            className="object-cover w-full h-full"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium bg-surface text-primary flex-shrink-0">
                          {displayName.charAt(0)}
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-primary text-[15px] leading-tight truncate">
                          {displayName}
                        </h4>
                        {neighborhoodName && (
                          <p className="text-sm text-text-secondary truncate">
                            {neighborhoodName}
                          </p>
                        )}
                      </div>

                      {/* Image */}
                      {imageUrl && (
                        <div className="relative w-16 h-10 flex-shrink-0 rounded-lg overflow-hidden">
                          <Image
                            src={imageUrl}
                            alt={displayName}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}

                      <ChevronRight className="w-4 h-4 text-text-secondary/50 flex-shrink-0" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Beta notice */}
        {location.beta && (
          <div className="shop-card-animate" style={staggerStyle(10)}>
            <div className="text-center py-3 px-4 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 text-sm">
              <span className="font-medium">{location.name} is in BETA.</span> More shops coming soon!
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
