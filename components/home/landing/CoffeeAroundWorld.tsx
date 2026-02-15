'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CircleFlag } from 'react-circle-flags';
import { Location } from '@/lib/types';
import { getMediaUrl, slugify } from '@/lib/utils';
import { useScrollReveal } from '@/hooks/useScrollReveal';

interface CoffeeCountry {
  name: string;
  code: string;
  coffee: { native: string; transliteration?: string };
  rtl?: boolean;
}

const COUNTRIES: CoffeeCountry[] = [
  { name: 'Kenya', code: 'ke', coffee: { native: 'Kahawa' } },
  { name: 'Morocco', code: 'ma', coffee: { native: 'قهوة', transliteration: 'Qahwa' }, rtl: true },
  { name: 'Kazakhstan', code: 'kz', coffee: { native: 'Кофе', transliteration: 'Kofe' } },
  { name: 'Tunisia', code: 'tn', coffee: { native: 'قهوة', transliteration: 'Qahwa' }, rtl: true },
  { name: 'Kyrgyzstan', code: 'kg', coffee: { native: 'Кофе', transliteration: 'Kofe' } },
  { name: 'Uzbekistan', code: 'uz', coffee: { native: 'Qahva' } },
  { name: 'Thailand', code: 'th', coffee: { native: 'กาแฟ', transliteration: 'Kafae' } },
  { name: 'United Kingdom', code: 'gb', coffee: { native: 'Coffee' } },
  { name: 'Turkey', code: 'tr', coffee: { native: 'Kahve' } },
  { name: 'Rwanda', code: 'rw', coffee: { native: 'Ikawa' } },
];

interface CityCard {
  name: string;
  slug: string;
  countrySlug: string;
  imageUrl: string | null;
}

interface CountryData {
  country: CoffeeCountry;
  cities: CityCard[];
}

interface CoffeeAroundWorldProps {
  locations: Location[];
}

export function CoffeeAroundWorld({ locations }: CoffeeAroundWorldProps) {
  const { ref: sectionRef, revealed } = useScrollReveal(0.1);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPausedRef = useRef(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check reduced motion preference
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Group locations by country code and match with COUNTRIES
  const countryData = useMemo<CountryData[]>(() => {
    const locationsByCountry = new Map<string, Location[]>();
    for (const loc of locations) {
      const code = loc.country?.code?.toLowerCase();
      if (code) {
        const list = locationsByCountry.get(code) || [];
        list.push(loc);
        locationsByCountry.set(code, list);
      }
    }

    return COUNTRIES
      .map((country) => {
        const locs = locationsByCountry.get(country.code) || [];
        const cities: CityCard[] = locs
          .slice(0, 3)
          .map((loc) => ({
            name: loc.name,
            slug: loc.slug || slugify(loc.name),
            countrySlug: loc.country?.slug || slugify(loc.country?.name || country.name),
            imageUrl: loc.background_image ? getMediaUrl(loc.background_image) : null,
          }));
        return { country, cities };
      })
      .filter((d) => d.cities.length > 0);
  }, [locations]);

  // Auto-cycling
  const startInterval = useCallback(() => {
    if (prefersReducedMotion || countryData.length <= 1) return;
    intervalRef.current = setInterval(() => {
      if (!isPausedRef.current) {
        setIsTransitioning(true);
        setTimeout(() => {
          setActiveIndex((prev) => (prev + 1) % countryData.length);
          setIsTransitioning(false);
        }, 350);
      }
    }, 5000);
  }, [countryData.length, prefersReducedMotion]);

  useEffect(() => {
    startInterval();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startInterval]);

  const handleMouseEnter = useCallback(() => {
    isPausedRef.current = true;
  }, []);

  const handleMouseLeave = useCallback(() => {
    isPausedRef.current = false;
  }, []);

  if (countryData.length === 0) return null;

  const active = countryData[activeIndex % countryData.length];
  const { country, cities } = active;

  return (
    <section
      ref={sectionRef}
      className="py-16 md:py-24 lg:py-32 overflow-hidden"
      style={{ background: '#1A1410', color: '#FAF7F5' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        style={{
          opacity: revealed ? 1 : 0,
          transform: revealed ? 'translateY(0)' : 'translateY(24px)',
          transition: 'opacity 0.7s ease-out, transform 0.7s ease-out',
        }}
      >
        {/* Single row: coffee word left, city cards pinned right */}
        <div
          className="flex items-end gap-6 lg:gap-10"
          style={{
            opacity: isTransitioning ? 0 : 1,
            transform: isTransitioning ? 'translateY(8px)' : 'translateY(0)',
            transition: 'opacity 0.35s ease-out, transform 0.35s ease-out',
          }}
        >
          {/* Left — coffee word + meta */}
          <div className="flex-shrink-0 pl-4 sm:pl-6 lg:pl-8">
            <p
              className="text-[4rem] sm:text-[5rem] md:text-[6rem] lg:text-[8rem] xl:text-[9rem] font-sans leading-[0.85] tracking-tight"
              style={{ color: '#FAF7F5' }}
              dir={country.rtl ? 'rtl' : undefined}
            >
              {country.coffee.native}
            </p>

            <div className="flex items-center gap-3 mt-2">
              <span className="inline-block w-12 h-12 md:w-14 md:h-14 flex-shrink-0"><CircleFlag countryCode={country.code} width="56" height="56" /></span>
              <span className="text-[3rem] sm:text-[4rem] md:text-[5rem] lg:text-[6.5rem] xl:text-[7.5rem] leading-[0.9]" style={{ color: '#A89B8C' }}>
                {country.name}
              </span>
            </div>
          </div>

          {/* Right — city cards, height matches left text block */}
          <div className="relative flex-1 min-w-0 self-stretch">
            {/* Left gradient fade */}
            <div className="absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none bg-gradient-to-r from-[#1A1410] to-transparent" />

            <div className={`flex gap-3 h-full items-stretch ${cities.length === 1 ? 'justify-start' : 'justify-end'}`}>
              {cities.map((city) => (
                <Link
                  key={city.slug}
                  href={`/${city.countrySlug}/${city.slug}`}
                  className="group flex-shrink-0 block rounded-xl overflow-hidden relative"
                  style={{ width: 220, minHeight: 150 }}
                >
                  {city.imageUrl ? (
                    <>
                      <Image
                        src={city.imageUrl}
                        alt={city.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="220px"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                    </>
                  ) : (
                    <div className="absolute inset-0" style={{ background: '#251C16' }} />
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-base md:text-lg font-normal text-white">
                      {city.name}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
