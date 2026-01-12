'use client';

import { useMemo } from 'react';
import { Location, Shop } from '@/lib/types';
import { Star } from 'lucide-react';
import { cn, getMediaUrl } from '@/lib/utils';
import Image from 'next/image';

interface WelcomeStatsProps {
  locations: Location[];
  shops: Shop[];
  onShopSelect: (shop: Shop) => void;
  onLocationSelect?: (location: Location) => void;
  compact?: boolean;
}

export function WelcomeStats({ locations, shops, onShopSelect, onLocationSelect, compact = false }: WelcomeStatsProps) {
  // Get featured shops - prioritize highly rated, then recommended, then any with ratings
  const topShops = useMemo(() => {
    // First try: shops with high Google ratings (4.5+)
    let featured = shops
      .filter((shop) => shop.google_rating && shop.google_rating >= 4.5)
      .sort((a, b) => {
        const ratingDiff = (b.google_rating || 0) - (a.google_rating || 0);
        if (ratingDiff !== 0) return ratingDiff;
        return (b.google_review_count || 0) - (a.google_review_count || 0);
      });

    // Second try: recommended shops (cityarearec)
    if (featured.length < 5) {
      const recommended = shops
        .filter((shop) => {
          const anyShop = shop as any;
          return anyShop.cityAreaRec === true || anyShop.city_area_rec === true || anyShop.cityarearec === true;
        })
        .filter((shop) => !featured.some((f) => f.documentId === shop.documentId));
      featured = [...featured, ...recommended];
    }

    // Third try: any shops with ratings
    if (featured.length < 5) {
      const withRatings = shops
        .filter((shop) => shop.google_rating && shop.google_rating > 0)
        .filter((shop) => !featured.some((f) => f.documentId === shop.documentId))
        .sort((a, b) => (b.google_rating || 0) - (a.google_rating || 0));
      featured = [...featured, ...withRatings];
    }

    return featured.slice(0, 5);
  }, [shops]);

  // Get top-rated cities (rating_stars >= 4)
  const topCities = useMemo(() => {
    return locations
      .filter((loc) => loc.rating_stars && loc.rating_stars >= 4)
      .sort((a, b) => {
        const ratingDiff = (b.rating_stars || 0) - (a.rating_stars || 0);
        if (ratingDiff !== 0) return ratingDiff;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 4);
  }, [locations]);

  return (
    <div className="flex-1 p-4 overflow-y-auto">
      {/* Top Coffee Cities - curved container with light contrast */}
      {topCities.length > 0 && (
        <div className="bg-gray-100 dark:bg-gray-800/50 rounded-2xl p-4 mb-4">
          <h3 className="text-xs font-medium text-text-secondary mb-3">
            Top Coffee Cities
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {topCities.map((location) => {
              const imageUrl = getMediaUrl(location.background_image);
              const countryCode = location.country?.code?.toLowerCase();
              const flagUrl = countryCode
                ? `https://flagcdn.com/w40/${countryCode}.png`
                : null;

              // Cascade color priority: location → country → default
              const primaryColor =
                location.primaryColor ||
                location.country?.primaryColor ||
                '#8B6F47';

              return (
                <button
                  key={location.documentId}
                  onClick={() => onLocationSelect?.(location)}
                  aria-label={`View ${location.name} city guide, rated ${location.rating_stars?.toFixed(1)} stars`}
                  className="group relative overflow-hidden rounded-xl transition-all duration-300 hover:shadow-md focus:shadow-md focus:outline-none focus:ring-2 focus:ring-accent text-left flex flex-col aspect-[4/3]"
                  style={{ backgroundColor: primaryColor }}
                >
                  {/* White overlay on entire card to make background a faint version of primaryColor */}
                  <div className="absolute inset-0 bg-white/90 dark:bg-white/10" />

                  {/* Rating badge in top left */}
                  {location.rating_stars && (
                    <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 bg-black/50 backdrop-blur-sm rounded-full px-1.5 py-0.5">
                      <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                      <span className="text-[10px] font-medium text-white">
                        {location.rating_stars.toFixed(1)}
                      </span>
                    </div>
                  )}

                  {/* Flag in top right */}
                  {flagUrl && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full overflow-hidden bg-background shadow-sm ring-1 ring-black/10">
                      <Image
                        src={flagUrl}
                        alt={location.country?.name || 'Country'}
                        width={20}
                        height={20}
                        className="object-cover w-full h-full"
                        unoptimized
                      />
                    </div>
                  )}

                  {/* Text section - styled in primaryColor to contrast against lighter background */}
                  <div className="relative p-3 mt-auto">
                    <h4
                      className="font-medium text-sm leading-tight line-clamp-2 mb-0.5"
                      style={{ color: primaryColor }}
                    >
                      {location.name}
                    </h4>
                    {location.country?.name && (
                      <p
                        className="text-xs truncate"
                        style={{ color: primaryColor, opacity: 0.7 }}
                      >
                        {location.country.name}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Featured Shops - curved container with light contrast */}
      {topShops.length > 0 && (
        <div className="bg-gray-100 dark:bg-gray-800/50 rounded-2xl p-4">
          <h3 className="text-xs font-medium text-text-secondary mb-3">
            Featured Shops
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {topShops.map((shop) => {
              const imageUrl = getMediaUrl(shop.featured_image);

              return (
                <button
                  key={shop.documentId}
                  onClick={() => onShopSelect(shop)}
                  className={cn(
                    "group relative overflow-hidden rounded-xl bg-surface hover:shadow-lg transition-all duration-300 hover:scale-[1.02]",
                    compact ? "aspect-[4/3]" : "aspect-square"
                  )}
                >
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={shop.prefName || shop.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-accent/40" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                  {/* Rating badge */}
                  {shop.google_rating && (
                    <div className={cn(
                      "absolute top-1.5 left-1.5 flex items-center gap-0.5 bg-black/50 backdrop-blur-sm rounded-full px-1.5 py-0.5"
                    )}>
                      <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                      <span className="text-[10px] font-medium text-white">
                        {shop.google_rating.toFixed(1)}
                      </span>
                    </div>
                  )}

                  <div className={cn(
                    "absolute bottom-0 left-0 right-0 text-left",
                    compact ? "p-2" : "p-3"
                  )}>
                    <h4 className={cn(
                      "font-bold text-white leading-tight line-clamp-2 mb-0.5",
                      compact ? "text-xs" : "text-sm"
                    )}>
                      {shop.prefName || shop.name}
                    </h4>
                    <p className={cn(
                      "text-white/80 truncate",
                      compact ? "text-[10px]" : "text-xs"
                    )}>
                      {shop.location?.name}
                      {shop.location?.country?.name && `, ${shop.location.country.name}`}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Getting Started */}
      <div className="mt-6 pt-4 border-t border-border-default">
        <p className="text-xs text-text-secondary text-center">
          Select a city above or click "Nearby" to get started
        </p>
      </div>
    </div>
  );
}
