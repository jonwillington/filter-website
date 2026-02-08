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
    <section className="px-6 pt-16 pb-24 md:px-12 md:pt-20 md:pb-32 lg:px-24 lg:pt-28 lg:pb-40" style={{ background: 'var(--surface-landing)' }}>
      <h2
        ref={headingRef}
        className="font-display text-5xl md:text-6xl lg:text-8xl text-primary mb-12 md:mb-16 lg:mb-18"
        style={{
          opacity: headingRevealed ? 1 : 0,
          transform: headingRevealed ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.8s ease-out, transform 0.8s ease-out',
        }}
      >
        Top cities
      </h2>

      <div ref={listRef} className="divide-y divide-border-default">
        {cities.map((city, index) => {
          const countryCode = city.country?.code;
          const countryColor = city.country?.primaryColor || 'var(--text-secondary)';

          return (
            <button
              key={city.documentId}
              onClick={() => onCitySelect(city)}
              className="w-full text-left group py-4 md:py-5 flex items-baseline justify-between gap-4"
              style={{
                opacity: listRevealed ? 1 : 0,
                transform: listRevealed ? 'translateY(0)' : 'translateY(14px)',
                transition: `opacity 0.5s ease-out ${index * 0.06}s, transform 0.5s ease-out ${index * 0.06}s`,
                '--city-color': countryColor,
              } as React.CSSProperties}
            >
              {/* Left: rank + city name */}
              <div className="flex items-baseline gap-3 md:gap-5 min-w-0">
                <span className="font-display text-lg md:text-xl lg:text-2xl text-text-secondary/30 leading-none tabular-nums flex-shrink-0 w-6 md:w-7 text-right">
                  {index + 1}
                </span>
                <h3 className="font-display text-3xl md:text-4xl lg:text-5xl text-primary leading-tight group-hover:text-accent transition-colors truncate">
                  {city.name}
                </h3>
              </div>

              {/* Right: country name, flag, rating (fixed-width columns for alignment) */}
              <div className="flex items-center gap-3 md:gap-5 flex-shrink-0">
                {city.country?.name && (
                  <span
                    className="landing-country-name font-display text-xl md:text-2xl lg:text-3xl hidden sm:inline transition-colors"
                    style={{ color: 'var(--accent)', lineHeight: 1 }}
                  >
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
                    <span className="font-display text-lg md:text-xl lg:text-2xl text-primary tabular-nums" style={{ lineHeight: 1 }}>
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
