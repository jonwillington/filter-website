'use client';

import { useMemo } from 'react';
import { Location, Shop } from '@/lib/types';
import { Star } from 'lucide-react';
import { getMediaUrl, getShopDisplayName } from '@/lib/utils';
import Image from 'next/image';

interface WelcomeStatsProps {
  locations: Location[];
  shops: Shop[];
  onShopSelect: (shop: Shop) => void;
  onLocationSelect?: (location: Location) => void;
  compact?: boolean;
}

const getFlagUrl = (countryCode: string): string =>
  `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;

export function WelcomeStats({ locations, shops, onShopSelect, onLocationSelect }: WelcomeStatsProps) {
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
    if (featured.length < 6) {
      const recommended = shops
        .filter((shop) => {
          const anyShop = shop as any;
          return anyShop.cityAreaRec === true || anyShop.city_area_rec === true || anyShop.cityarearec === true;
        })
        .filter((shop) => !featured.some((f) => f.documentId === shop.documentId));
      featured = [...featured, ...recommended];
    }

    // Third try: any shops with ratings
    if (featured.length < 6) {
      const withRatings = shops
        .filter((shop) => shop.google_rating && shop.google_rating > 0)
        .filter((shop) => !featured.some((f) => f.documentId === shop.documentId))
        .sort((a, b) => (b.google_rating || 0) - (a.google_rating || 0));
      featured = [...featured, ...withRatings];
    }

    return featured.slice(0, 6);
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
      .slice(0, 5);
  }, [locations]);

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Top Coffee Cities */}
      {topCities.length > 0 && (
        <div className="p-4 border-b border-black/5 dark:border-white/5">
          <h3 className="text-xs font-medium text-primary opacity-60 uppercase tracking-wider mb-4">
            Top Coffee Cities
          </h3>
          <div className="space-y-1">
            {topCities.map((location, index) => {
              const imageUrl = getMediaUrl(location.background_image);
              const countryCode = location.country?.code;
              const isLast = index === topCities.length - 1;

              return (
                <button
                  key={location.documentId}
                  onClick={() => onLocationSelect?.(location)}
                  className={`w-full text-left py-3 group ${!isLast ? 'border-b border-black/5 dark:border-white/5' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base text-primary leading-tight line-clamp-1 group-hover:text-amber-900 dark:group-hover:text-amber-700 transition-colors">
                        {location.name}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {countryCode && (
                          <span className="w-3 h-3 rounded-full overflow-hidden flex-shrink-0 border border-border-default">
                            <Image
                              src={getFlagUrl(countryCode)}
                              alt={location.country?.name || ''}
                              width={12}
                              height={12}
                              className="object-cover w-full h-full"
                              unoptimized
                            />
                          </span>
                        )}
                        {location.country?.name && (
                          <span className="text-sm text-text-secondary">{location.country.name}</span>
                        )}
                        {location.rating_stars && (
                          <>
                            <span className="text-text-secondary/30">·</span>
                            <div className="flex items-center gap-0.5">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <span className="text-sm text-text-secondary">{location.rating_stars.toFixed(1)}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    {imageUrl && (
                      <div className="relative w-16 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-white/5">
                        <Image
                          src={imageUrl}
                          alt={location.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Featured Shops */}
      {topShops.length > 0 && (
        <div className="p-4">
          <h3 className="text-xs font-medium text-primary opacity-60 uppercase tracking-wider mb-4">
            Featured Shops
          </h3>
          <div className="space-y-1">
            {topShops.map((shop, index) => {
              const imageUrl = getMediaUrl(shop.featured_image);
              const logoUrl = getMediaUrl(shop.brand?.logo);
              const displayName = getShopDisplayName(shop);
              const isLast = index === topShops.length - 1;

              // Get description - prefer brand story for independents, shop description for chains
              const isIndependent = shop.independent === true || shop.is_chain === false;
              const description = isIndependent
                ? (shop.brand?.story || shop.brand?.description || (shop as any).description)
                : ((shop as any).description || (shop as any).shop_description || shop.brand?.story);

              return (
                <button
                  key={shop.documentId}
                  onClick={() => onShopSelect(shop)}
                  className={`w-full text-left py-3 group ${!isLast ? 'border-b border-black/5 dark:border-white/5' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    {logoUrl ? (
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-border-default flex-shrink-0">
                        <Image
                          src={logoUrl}
                          alt={shop.brand?.name || ''}
                          width={36}
                          height={36}
                          className="object-cover w-full h-full"
                        />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm bg-border-default text-primary flex-shrink-0">
                        {displayName.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base text-primary leading-tight line-clamp-1 group-hover:text-amber-900 dark:group-hover:text-amber-700 transition-colors">
                        {displayName}
                      </h4>
                      {description && (
                        <p className="text-xs text-text-secondary line-clamp-2 mt-0.5">
                          {description}
                        </p>
                      )}
                    </div>
                    <div className="relative w-16 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-white/5">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={displayName}
                          fill
                          className="object-cover"
                        />
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Getting Started hint */}
      <div className="px-4 pb-4">
        <p className="text-xs text-text-secondary text-center">
          Select a city or tap Explore to get started
        </p>
      </div>
    </div>
  );
}
