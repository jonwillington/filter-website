'use client';

import { memo } from 'react';
import Image from 'next/image';
import { Location } from '@/lib/types';
import { getMediaUrl } from '@/lib/utils';
import { Star, ChevronLeft, ArrowRight } from 'lucide-react';

interface LocationCardProps {
  location: Location;
  onReadCityGuide: () => void;
  onBack?: () => void;
}

const getFlagUrl = (countryCode: string): string =>
  `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;

function LocationCardComponent({ location, onReadCityGuide, onBack }: LocationCardProps) {
  const backgroundImage = getMediaUrl(location.background_image);
  const countryCode = location.country?.code;
  const countryName = location.country?.name;

  // Primary color for accent elements (city guide link)
  const primaryColor =
    location.primaryColor ||
    location.country?.primaryColor ||
    '#8B6F47';

  return (
    <div className="border-b border-border-default">
      {/* Back to home link - separate section with border */}
      {onBack && (
        <div className="px-4 py-4 border-b border-border-default">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-accent hover:text-accent/80 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-xl font-medium text-primary leading-tight">Back to home</span>
          </button>
        </div>
      )}

      <div className="p-4">
        <div className="flex gap-4">
          {/* Left - Content */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            {/* Top section */}
            <div>
              {/* Location name */}
              <h1 className="text-3xl font-medium leading-tight text-primary">
                {location.name}
              </h1>

            {/* Country with flag and rating row */}
            <div className="flex items-center gap-2 mt-1">
              {countryCode && (
                <span className="w-3.5 h-3.5 rounded-full overflow-hidden flex-shrink-0 border border-border-default">
                  <Image
                    src={getFlagUrl(countryCode)}
                    alt={countryName || ''}
                    width={14}
                    height={14}
                    className="object-cover w-full h-full"
                    unoptimized
                  />
                </span>
              )}
              {countryName && (
                <p className="text-text-secondary text-sm">
                  {countryName}
                </p>
              )}
              {location.rating_stars && (
                <>
                  <span className="text-text-secondary">·</span>
                  <div className="flex items-center gap-0.5">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span className="text-text-secondary text-sm">
                      {location.rating_stars.toFixed(1)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* City guide link - pinned to bottom */}
          <button
            onClick={onReadCityGuide}
            className="flex items-center gap-1 text-sm font-medium hover:opacity-80 transition-opacity text-left"
            style={{ color: primaryColor }}
          >
            Read city guide
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right - Image */}
        {backgroundImage && (
          <div className="relative w-1/2 h-28 rounded-xl overflow-hidden flex-shrink-0">
            <Image
              src={backgroundImage}
              alt={location.name}
              fill
              className="object-cover"
            />
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

export const LocationCard = memo(LocationCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.location.documentId === nextProps.location.documentId &&
    prevProps.onBack === nextProps.onBack
  );
});
