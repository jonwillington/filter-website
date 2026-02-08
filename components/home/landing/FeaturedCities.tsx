'use client';

import Image from 'next/image';
import { Star, ArrowRight } from 'lucide-react';
import { Location } from '@/lib/types';

const getFlagUrl = (countryCode: string): string =>
  `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;

interface FeaturedCitiesProps {
  cities: Location[];
  onCitySelect: (location: Location) => void;
}

export function FeaturedCities({ cities, onCitySelect }: FeaturedCitiesProps) {
  if (cities.length === 0) return null;

  return (
    <section className="px-6 pt-16 pb-24 md:px-12 md:pt-20 md:pb-32 lg:px-24 lg:pt-28 lg:pb-40 bg-background">
      <h2 className="font-display text-3xl md:text-4xl lg:text-5xl text-primary mb-10 md:mb-14">
        Top coffee cities
      </h2>

      <div className="divide-y divide-border-default">
        {cities.map((city) => {
          const countryCode = city.country?.code;

          return (
            <button
              key={city.documentId}
              onClick={() => onCitySelect(city)}
              className="w-full text-left group py-5 md:py-6 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 md:gap-5 min-w-0">
                {/* Rating on the left — big and dominant */}
                {city.rating_stars && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Star className="w-5 h-5 md:w-6 md:h-6 fill-current text-amber-400" />
                    <span className="font-display text-3xl md:text-4xl lg:text-5xl text-primary leading-none">{city.rating_stars.toFixed(1)}</span>
                  </div>
                )}
                {city.rating_stars && (
                  <span className="text-text-secondary text-2xl md:text-3xl leading-none select-none">&middot;</span>
                )}
                <h3 className="font-display text-4xl md:text-5xl lg:text-6xl text-primary leading-tight group-hover:text-accent transition-colors">
                  {city.name}
                </h3>
              </div>

              <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
                {countryCode && (
                  <span className="w-8 h-6 md:w-10 md:h-7 rounded-sm overflow-hidden flex-shrink-0 hidden sm:inline-block opacity-40">
                    <Image
                      src={getFlagUrl(countryCode)}
                      alt={city.country?.name || ''}
                      width={40}
                      height={28}
                      className="object-cover w-full h-full"
                      unoptimized
                    />
                  </span>
                )}
                {city.country?.name && (
                  <span
                    className="font-display text-3xl md:text-4xl lg:text-5xl hidden sm:inline"
                    style={{ color: city.country.primaryColor || 'var(--text)' }}
                  >
                    {city.country.name}
                  </span>
                )}
                <ArrowRight className="w-6 h-6 md:w-8 md:h-8 text-text-secondary opacity-30 group-hover:opacity-80 transition-opacity flex-shrink-0" />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
