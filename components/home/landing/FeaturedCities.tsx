'use client';

import Image from 'next/image';
import { Star } from 'lucide-react';
import { Location } from '@/lib/types';
import { useScrollReveal } from '@/hooks/useScrollReveal';

const getFlagUrl = (countryCode: string): string =>
  `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;

interface FeaturedCitiesProps {
  cities: Location[];
  onCitySelect: (location: Location) => void;
}

export function FeaturedCities({ cities, onCitySelect }: FeaturedCitiesProps) {
  const { ref: headingRef, revealed: headingRevealed } = useScrollReveal();
  const { ref: listRef, revealed: listRevealed } = useScrollReveal(0.05);

  if (cities.length === 0) return null;

  return (
    <section className="px-6 pt-24 pb-24 md:px-12 md:pt-32 md:pb-32 lg:px-24 lg:pt-40 lg:pb-40" style={{ background: 'var(--surface-landing)' }}>
      <h2
        ref={headingRef}
        className="font-display text-5xl md:text-6xl lg:text-8xl text-primary mb-4 md:mb-6"
        style={{
          opacity: headingRevealed ? 1 : 0,
          transform: headingRevealed ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.8s ease-out, transform 0.8s ease-out',
        }}
      >
        Top cities
      </h2>
      <p
        className="font-display text-3xl md:text-4xl lg:text-5xl text-primary opacity-30 mb-12 md:mb-16 lg:mb-18"
        style={{
          opacity: headingRevealed ? 0.3 : 0,
          transform: headingRevealed ? 'translateY(0)' : 'translateY(12px)',
          transition: 'opacity 0.8s ease-out 0.1s, transform 0.8s ease-out 0.1s',
        }}
      >
        100+ locations being added this year
      </p>

      <div ref={listRef}>
        {cities.map((city, index) => {
          const countryCode = city.country?.code;

          return (
            <button
              key={city.documentId}
              onClick={() => onCitySelect(city)}
              className="w-full text-left group py-4 md:py-5 flex items-center justify-between gap-4 border-b border-amber-200/40 dark:border-amber-900/30 last:border-b-0"
              style={{
                opacity: listRevealed ? 1 : 0,
                transform: listRevealed ? 'translateY(0)' : 'translateY(14px)',
                transition: `opacity 0.5s ease-out ${index * 0.06}s, transform 0.5s ease-out ${index * 0.06}s`,
              }}
            >
              {/* Left: rank + city name */}
              <div className="flex items-center gap-3 md:gap-5 min-w-0">
                <span className="font-display text-lg md:text-xl lg:text-2xl text-text-secondary leading-none tabular-nums flex-shrink-0 w-6 md:w-7 text-right opacity-30">
                  {index + 1}
                </span>
                <h3 className="font-display text-3xl md:text-4xl lg:text-5xl text-primary leading-none group-hover:text-accent transition-colors truncate">
                  {city.name}
                </h3>
              </div>

              {/* Right: country name, flag, rating */}
              <div className="flex items-center gap-3 md:gap-5 flex-shrink-0">
                {city.country?.name && (
                  <span className="font-display text-2xl md:text-3xl lg:text-4xl text-primary opacity-30 hidden sm:inline leading-none">
                    {city.country.name}
                  </span>
                )}
                {countryCode && (
                  <span className="w-7 h-5 md:w-9 md:h-6 rounded-md overflow-hidden flex-shrink-0 hidden sm:inline-block">
                    <Image
                      src={getFlagUrl(countryCode)}
                      alt={city.country?.name || ''}
                      width={36}
                      height={24}
                      className="object-cover w-full h-full"
                      unoptimized
                    />
                  </span>
                )}
                {city.rating_stars && (
                  <div className="flex items-center gap-1.5 flex-shrink-0 w-16 md:w-20 justify-end">
                    <Star className="w-4 h-4 md:w-5 md:h-5 fill-current text-amber-400" />
                    <span className="font-display text-lg md:text-xl lg:text-2xl text-primary tabular-nums leading-none">
                      {city.rating_stars.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
