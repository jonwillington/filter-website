'use client';

import { memo } from 'react';
import Image from 'next/image';
import { Location } from '@/lib/types';
import { getMediaUrl } from '@/lib/utils';
import { Star, ArrowRight } from 'lucide-react';

interface LocationCardProps {
  location: Location;
  onReadCityGuide: () => void;
}

const getFlagUrl = (countryCode: string): string =>
  `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;

function LocationCardComponent({ location, onReadCityGuide }: LocationCardProps) {
  const backgroundImage = getMediaUrl(location.background_image);
  const countryCode = location.country?.code;
  const countryName = location.country?.name;

  // Primary color for accent elements (city guide link)
  const primaryColor =
    location.primaryColor ||
    location.country?.primaryColor ||
    '#8B6F47';

  const storyText = location.story || `Discover the best specialty coffee shops in ${location.name}. Our curated guide covers independent roasters, hidden gems, and the cafes locals love.`;

  return (
    <div className="border-b border-border-default">
      {/* Image card with overlaid text */}
      <div className="relative h-52 overflow-hidden rounded-xl mx-4 mt-4">
        {backgroundImage && (
          <Image
            src={backgroundImage}
            alt={location.name}
            fill
            className="object-cover"
          />
        )}
        {/* Gradient overlay - darker towards bottom for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/30 to-black/80" />

        {/* Text content over gradient */}
        <div className="absolute inset-0 flex flex-col justify-end p-4">
          {/* Location name */}
          <h1 className="text-3xl font-medium leading-tight text-white">
            {location.name}
          </h1>

          {/* Country with flag and rating row */}
          <div className="flex items-center gap-2 mt-1">
            {countryCode && (
              <span className="w-3.5 h-3.5 rounded-full overflow-hidden flex-shrink-0 border border-white/20">
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
              <p className="text-white/80 text-sm">
                {countryName}
              </p>
            )}
            {location.rating_stars && (
              <>
                <span className="text-white/50">·</span>
                <div className="flex items-center gap-0.5">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span className="text-white/80 text-sm">
                    {location.rating_stars.toFixed(1)}
                  </span>
                </div>
              </>
            )}
            <span className="text-white/50">·</span>
            <button
              onClick={onReadCityGuide}
              className="flex items-center gap-0.5 text-sm font-medium text-white/80 hover:text-white transition-colors"
            >
              City guide
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Story excerpt */}
          <p className="text-xs text-white/70 leading-snug line-clamp-2 mt-2">
            {storyText}
          </p>
        </div>
      </div>
    </div>
  );
}

export const LocationCard = memo(LocationCardComponent, (prevProps, nextProps) => {
  return prevProps.location.documentId === nextProps.location.documentId;
});
