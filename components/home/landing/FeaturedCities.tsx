'use client';

import { ArrowRight, Star } from 'lucide-react';
import { CircleFlag } from 'react-circle-flags';
import { Location } from '@/lib/types';
import { getStoryText } from '@/lib/utils/storyBlocks';
import { useScrollReveal } from '@/hooks/useScrollReveal';


interface FeaturedCitiesProps {
  cities: Location[];
  onCitySelect: (location: Location) => void;
  onExploreMap?: () => void;
  shopCountByLocation?: Map<string, number>;
}

export function FeaturedCities({ cities, onCitySelect, onExploreMap, shopCountByLocation }: FeaturedCitiesProps) {
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

      {/* Contrast container */}
      <div className="rounded-2xl border border-border-default overflow-hidden" style={{ background: 'color-mix(in srgb, var(--surface-landing) 60%, var(--background))' }}>
        {/* Column header bar */}
        <div className="hidden sm:grid grid-cols-[5rem_1fr_14rem_6rem_5rem_3rem] border-b border-border-default">
          <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-secondary flex items-center justify-center py-2.5">
            Rank
          </span>
          <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-secondary flex items-center py-2.5 pl-5 border-l border-border-default">
            City
          </span>
          <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-secondary flex items-center py-2.5 px-5 border-l border-border-default">
            Country
          </span>
          <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-secondary flex items-center justify-center py-2.5 border-l border-border-default">
            Rating
          </span>
          <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-secondary flex items-center justify-center py-2.5 border-l border-border-default">
            Shops
          </span>
          <span className="border-l border-border-default" />
        </div>

        <div ref={listRef} className="relative">
          {cities.map((city, i) => {
            const countryCode = city.country?.code;
            const countryName = city.country?.name;
            const isTop = i < 3;

            return (
              <div
                key={city.documentId}
                className={i < cities.length - 1 ? 'border-b border-border-default' : ''}
                style={{
                  opacity: listRevealed ? 1 : 0,
                  transform: listRevealed ? 'translateY(0)' : 'translateY(12px)',
                  transition: `opacity 0.5s ease-out ${i * 0.06}s, transform 0.5s ease-out ${i * 0.06}s`,
                }}
              >
                <button
                  onClick={() => onCitySelect(city)}
                  className="w-full text-left group grid grid-cols-[3.5rem_1fr_5rem_4rem_2.5rem] sm:grid-cols-[5rem_1fr_14rem_6rem_5rem_3rem]"
                >
                  {/* Rank cell */}
                  <span className={`font-mono tabular-nums flex items-center justify-center ${
                    isTop
                      ? 'text-2xl md:text-3xl font-semibold text-primary py-5 md:py-6'
                      : 'text-base md:text-lg text-text-secondary py-3 md:py-3.5'
                  }`}>
                    {String(i + 1).padStart(2, '0')}
                  </span>

                  {/* City cell */}
                  <div className={`flex flex-col justify-center pl-5 border-l border-border-default min-w-0 ${
                    isTop ? 'py-5 md:py-6' : 'py-3 md:py-3.5'
                  }`}>
                    <h3 className={`text-primary leading-tight group-hover:text-accent transition-colors truncate ${
                      isTop
                        ? 'font-display text-4xl md:text-5xl lg:text-6xl'
                        : 'font-display text-xl md:text-2xl'
                    }`}>
                      {city.name}
                    </h3>
                    {isTop && (city.headline || city.story) && (
                      <p className="text-text-secondary text-xs md:text-sm mt-1 truncate">
                        {(() => { const t = city.headline || getStoryText(city.story); return t && t.length > 80 ? t.substring(0, 80) + '…' : t; })()}
                      </p>
                    )}
                  </div>

                  {/* Country cell — hidden on mobile */}
                  <div className={`items-center hidden sm:flex px-5 border-l border-border-default ${
                    isTop ? 'gap-3 py-5 md:py-6' : 'gap-2 py-3 md:py-3.5'
                  }`}>
                    {countryCode && (
                      <CircleFlag
                        countryCode={countryCode.toLowerCase()}
                        width={isTop ? 28 : 20}
                        className="flex-shrink-0"
                      />
                    )}
                    {countryName && (
                      <span className={`font-medium text-text-secondary whitespace-nowrap ${
                        isTop ? 'text-2xl md:text-3xl' : 'text-base md:text-lg'
                      }`}>
                        {countryName}
                      </span>
                    )}
                  </div>

                  {/* Rating cell */}
                  <div className={`flex items-center justify-center gap-1.5 border-l border-border-default ${
                    isTop ? 'py-5 md:py-6' : 'py-3 md:py-3.5'
                  }`}>
                    <Star className={`text-amber-400 fill-amber-400 ${
                      isTop ? 'w-5 h-5' : 'w-3.5 h-3.5'
                    }`} />
                    <span className={`font-mono text-primary tabular-nums ${
                      isTop ? 'text-xl md:text-2xl' : 'text-sm md:text-base'
                    }`}>
                      {city.rating_stars?.toFixed(1) ?? '—'}
                    </span>
                  </div>

                  {/* Shops count cell */}
                  <div className={`flex items-center justify-center border-l border-border-default ${
                    isTop ? 'py-5 md:py-6' : 'py-3 md:py-3.5'
                  }`}>
                    <span className={`font-mono tabular-nums text-text-secondary ${
                      isTop ? 'text-base md:text-lg' : 'text-xs md:text-sm'
                    }`}>
                      {shopCountByLocation?.get(city.documentId) ?? '—'}
                    </span>
                  </div>

                  {/* Arrow cell */}
                  <div className="flex items-center justify-center border-l border-border-default">
                    <ArrowRight className="w-4 h-4 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              </div>
            );
          })}

          {/* Gradient fade */}
          <div className="absolute bottom-0 left-0 right-0 h-[40%] pointer-events-none"
            style={{ background: 'linear-gradient(to top, color-mix(in srgb, var(--surface-landing) 60%, var(--background)) 5%, transparent)' }}
          />
        </div>

        {/* Footer row */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-border-default">
          <span className="text-[11px] font-mono text-text-secondary tracking-wide">
            100+ cities coming to Filter this year
          </span>
          {onExploreMap && (
            <button
              onClick={onExploreMap}
              className="px-6 py-2.5 rounded-full bg-primary text-background text-sm font-medium hover:opacity-90 transition-opacity"
            >
              View all cities
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
