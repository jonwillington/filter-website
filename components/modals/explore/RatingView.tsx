'use client';

import Image from 'next/image';
import { ChevronRight } from 'lucide-react';
import { Location } from '@/lib/types';
import { StarRating } from '@/components/ui/StarRating';
import { getFlagUrl } from './types';
import { cn } from '@/lib/utils';

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
  return (
    <div className="py-2">
      <div>
        {locationsByRating.map((location, index) => {
          const shopCount = shopCountByLocation.get(location.documentId) || 0;
          const isComingSoon = location.comingSoon;

          const rowContent = (
            <>
              {/* Rank number */}
              <span className={cn(
                "text-sm font-medium w-6 text-right flex-shrink-0",
                isComingSoon ? "text-border-default/50" : "text-border-default"
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
                  ? "text-border-default/50"
                  : "text-border-default group-hover:text-accent"
              )} />
            </>
          );

          if (isComingSoon) {
            return (
              <div
                key={location.documentId}
                className="w-full flex items-center gap-4 lg:gap-5 py-3 px-4 lg:px-6 border-b border-border-default last:border-b-0 cursor-default"
              >
                {rowContent}
              </div>
            );
          }

          return (
            <button
              key={location.documentId}
              onClick={() => onLocationSelect(location)}
              className="group w-full flex items-center gap-4 lg:gap-5 py-3 px-4 lg:px-6 transition-colors hover:bg-surface border-b border-border-default last:border-b-0"
            >
              {rowContent}
            </button>
          );
        })}
      </div>
    </div>
  );
}
