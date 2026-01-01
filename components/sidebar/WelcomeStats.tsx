'use client';

import { useMemo } from 'react';
import { Location, Shop } from '@/lib/types';
import { Coffee, MapPin, Globe, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WelcomeStatsProps {
  locations: Location[];
  shops: Shop[];
  onShopSelect: (shop: Shop) => void;
}

export function WelcomeStats({ locations, shops, onShopSelect }: WelcomeStatsProps) {
  // Calculate stats
  const stats = useMemo(() => {
    const uniqueCountries = new Set(
      locations
        .map((loc) => loc.country?.name)
        .filter(Boolean)
    );

    return {
      shopCount: shops.length,
      cityCount: locations.length,
      countryCount: uniqueCountries.size,
    };
  }, [locations, shops]);

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

  return (
    <div className="flex-1 p-4 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-text mb-2">Welcome to Filter</h2>
        <p className="text-sm text-textSecondary">
          Discover the best specialty coffee shops around the world
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard
          icon={<Coffee className="w-5 h-5" />}
          value={stats.shopCount}
          label="Shops"
        />
        <StatCard
          icon={<MapPin className="w-5 h-5" />}
          value={stats.cityCount}
          label="Cities"
        />
        <StatCard
          icon={<Globe className="w-5 h-5" />}
          value={stats.countryCount}
          label="Countries"
        />
      </div>

      {/* Top Rated Shops */}
      {topShops.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            Featured Shops
          </h3>
          <div className="space-y-2">
            {topShops.map((shop) => (
              <button
                key={shop.documentId}
                onClick={() => onShopSelect(shop)}
                className={cn(
                  'w-full text-left p-3 rounded-lg',
                  'bg-surface hover:bg-surfaceHover',
                  'border border-border',
                  'transition-colors cursor-pointer'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-text text-sm truncate">
                      {shop.prefName || shop.name}
                    </p>
                    <p className="text-xs text-textSecondary truncate">
                      {shop.location?.name}
                      {shop.location?.country?.name && `, ${shop.location.country.name}`}
                    </p>
                  </div>
                  {shop.google_rating && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-medium text-text">
                        {shop.google_rating.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Getting Started */}
      <div className="mt-6 pt-4 border-t border-border">
        <p className="text-xs text-textSecondary text-center">
          Select a city above or click "Nearby" to get started
        </p>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="bg-surface border border-border rounded-lg p-3 text-center">
      <div className="flex justify-center mb-1 text-accent">{icon}</div>
      <p className="text-lg font-bold text-text">{value}</p>
      <p className="text-xs text-textSecondary">{label}</p>
    </div>
  );
}
