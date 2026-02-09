'use client';

import Image from 'next/image';
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
    <section
      className="px-6 pt-24 pb-24 md:px-12 md:pt-32 md:pb-32 lg:px-24 lg:pt-40 lg:pb-40"
      style={{ background: 'var(--surface-landing)' }}
    >
      {/* Header */}
      <div
        ref={headingRef}
        className="mb-12 md:mb-16 lg:mb-20"
        style={{
          opacity: headingRevealed ? 1 : 0,
          transform: headingRevealed ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.8s ease-out, transform 0.8s ease-out',
        }}
      >
        <h2 className="font-display text-5xl md:text-6xl lg:text-8xl text-primary mb-3 md:mb-4">
          Top Cities
        </h2>
        <p className="text-text-secondary text-base md:text-lg max-w-xl">
          Our highest-rated destinations for specialty coffee
        </p>
      </div>

      {/* Typography-first city list */}
      <div ref={listRef} className="border-t border-border-default">
        {cities.map((city, i) => {
          const countryCode = city.country?.code;
          const countryName = city.country?.name;

          return (
            <button
              key={city.documentId}
              onClick={() => onCitySelect(city)}
              className="w-full text-left group flex items-center gap-4 md:gap-6 py-6 md:py-8 border-b border-border-default"
              style={{
                opacity: listRevealed ? 1 : 0,
                transform: listRevealed ? 'translateY(0)' : 'translateY(12px)',
                transition: `opacity 0.5s ease-out ${i * 0.06}s, transform 0.5s ease-out ${i * 0.06}s`,
              }}
            >
              {/* Rank */}
              <span className="text-sm font-mono text-text-secondary w-6 flex-shrink-0 tabular-nums">
                {String(i + 1).padStart(2, '0')}
              </span>

              {/* Name + country */}
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-3xl md:text-4xl lg:text-5xl text-primary leading-none group-hover:text-accent transition-colors">
                  {city.name}
                </h3>
                {(countryCode || countryName) && (
                  <div className="flex items-center gap-2 mt-2">
                    {countryCode && (
                      <span className="w-5 h-3.5 rounded-[2px] overflow-hidden flex-shrink-0">
                        <Image
                          src={getFlagUrl(countryCode)}
                          alt={countryName || ''}
                          width={20}
                          height={14}
                          className="object-cover w-full h-full"
                          unoptimized
                        />
                      </span>
                    )}
                    {countryName && (
                      <span className="text-sm text-text-secondary">
                        {countryName}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Rating */}
              {city.rating_stars && (
                <div className="flex-shrink-0 text-right">
                  <span className="font-display text-2xl md:text-3xl text-primary leading-none tabular-nums">
                    {city.rating_stars.toFixed(1)}
                  </span>
                  <p className="text-xs text-text-secondary mt-0.5">rating</p>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
