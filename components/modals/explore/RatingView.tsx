'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';
import { Location } from '@/lib/types';
import { StarRating } from '@/components/ui/StarRating';
import { getFlagUrl } from './types';
import { cn } from '@/lib/utils';

// Rating tier definitions with descriptions (can be updated later)
const RATING_TIERS = [
  {
    minRating: 4,
    label: '4+ stars',
    description: 'World class cities for coffee with immense choice and quality',
  },
  {
    minRating: 3,
    label: '3–4 stars',
    description: 'Solid variety of quality shops',
  },
  {
    minRating: 2,
    label: '2–3 stars',
    description: 'Growing coffee scenes',
  },
  {
    minRating: 0,
    label: 'Under 2 stars',
    description: 'Emerging destinations',
  },
];

interface RatingViewProps {
  locationsByRating: Location[];
  shopCountByLocation: Map<string, number>;
  onLocationSelect: (location: Location) => void;
}

export function RatingView({
  locationsByRating,
  shopCountByLocation,
  onLocationSelect,
}: RatingViewProps) {
  // Group locations by rating tier
  const groupedByTier = useMemo(() => {
    const groups: { tier: typeof RATING_TIERS[0]; locations: Location[] }[] = [];

    for (const tier of RATING_TIERS) {
      const nextTierMin = RATING_TIERS[RATING_TIERS.indexOf(tier) - 1]?.minRating ?? Infinity;
      const locations = locationsByRating.filter((loc) => {
        const rating = loc.rating_stars || 0;
        return rating >= tier.minRating && rating < nextTierMin;
      });

      if (locations.length > 0) {
        groups.push({ tier, locations });
      }
    }

    return groups;
  }, [locationsByRating]);

  const renderLocationRow = (location: Location, index: number) => {
    const shopCount = shopCountByLocation.get(location.documentId) || 0;
    const isComingSoon = location.comingSoon;

    const rowContent = (
      <>
        {/* Rank number */}
        <span className={cn(
          "text-sm font-medium w-6 text-right flex-shrink-0",
          isComingSoon ? "text-text-secondary/50" : "text-text-secondary"
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
            ? "text-text-secondary/50"
            : "text-text-secondary group-hover:text-accent"
        )} />
      </>
    );

    if (isComingSoon) {
      return (
        <div
          key={location.documentId}
          className="w-full flex items-center gap-4 lg:gap-5 py-3 pl-2 pr-4 lg:pl-4 lg:pr-6 border-b border-border-default last:border-b-0 cursor-default"
        >
          {rowContent}
        </div>
      );
    }

    return (
      <button
        key={location.documentId}
        onClick={() => onLocationSelect(location)}
        className="group w-full flex items-center gap-4 lg:gap-5 py-3 pl-2 pr-4 lg:pl-4 lg:pr-6 transition-colors hover:bg-surface border-b border-border-default last:border-b-0"
      >
        {rowContent}
      </button>
    );
  };

  // Track running index across all groups for continuous numbering
  let runningIndex = 0;

  return (
    <div className="py-2">
      {groupedByTier.map(({ tier, locations }, groupIndex) => (
        <div key={tier.label} className={groupIndex > 0 ? 'mt-6' : ''}>
          {/* Tier header */}
          <div className="px-4 lg:px-6 py-3">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-medium text-primary">{tier.label}</h3>
              <span className="text-sm text-text-secondary">{locations.length} {locations.length === 1 ? 'city' : 'cities'}</span>
            </div>
            <p className="text-sm text-text-secondary mt-0.5">{tier.description}</p>
          </div>

          {/* Locations in this tier */}
          <div>
            {locations.map((location) => {
              const row = renderLocationRow(location, runningIndex);
              runningIndex++;
              return row;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
