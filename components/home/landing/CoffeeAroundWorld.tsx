'use client';

import Image from 'next/image';
import { useScrollReveal } from '@/hooks/useScrollReveal';

interface CoffeeCountry {
  name: string;
  code: string;
  coffee: { native: string; transliteration?: string };
  color: string;
  rtl?: boolean;
}

const COUNTRIES: CoffeeCountry[] = [
  { name: 'Kenya', code: 'ke', coffee: { native: 'Kahawa' }, color: '#006228' },
  { name: 'Morocco', code: 'ma', coffee: { native: 'قهوة', transliteration: 'Qahwa' }, color: '#C1272D', rtl: true },
  { name: 'Kazakhstan', code: 'kz', coffee: { native: 'Кофе', transliteration: 'Kofe' }, color: '#00AFCA' },
  { name: 'Tunisia', code: 'tn', coffee: { native: 'قهوة', transliteration: 'Qahwa' }, color: '#E70013', rtl: true },
  { name: 'Kyrgyzstan', code: 'kg', coffee: { native: 'Кофе', transliteration: 'Kofe' }, color: '#EF3340' },
  { name: 'Uzbekistan', code: 'uz', coffee: { native: 'Qahva' }, color: '#1EB53A' },
  { name: 'Thailand', code: 'th', coffee: { native: 'กาแฟ', transliteration: 'Kafae' }, color: '#A51931' },
  { name: 'United Kingdom', code: 'gb', coffee: { native: 'Coffee' }, color: '#012169' },
  { name: 'Turkey', code: 'tr', coffee: { native: 'Kahve' }, color: '#E30A17' },
  { name: 'Rwanda', code: 'rw', coffee: { native: 'Ikawa' }, color: '#00A1DE' },
];

const ROW_1 = [COUNTRIES[0], COUNTRIES[1], COUNTRIES[2], COUNTRIES[3], COUNTRIES[4],
               COUNTRIES[5], COUNTRIES[6], COUNTRIES[7], COUNTRIES[8], COUNTRIES[9]];
const ROW_2 = [COUNTRIES[5], COUNTRIES[8], COUNTRIES[1], COUNTRIES[6], COUNTRIES[3],
               COUNTRIES[9], COUNTRIES[0], COUNTRIES[4], COUNTRIES[7], COUNTRIES[2]];

function CoffeeCard({ country }: { country: CoffeeCountry }) {
  const bg = `color-mix(in srgb, ${country.color} 5%, white 95%)`;

  return (
    <div
      className="rounded-2xl flex flex-col justify-end px-4 py-4 md:px-5 md:py-5 flex-shrink-0 min-w-[180px] md:min-w-[230px]"
      style={{ backgroundColor: bg }}
      dir={country.rtl ? 'rtl' : undefined}
    >
      <p
        className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display leading-none mb-2"
        style={{ color: country.color }}
      >
        {country.coffee.native}
      </p>
      <div className="flex items-center gap-2 pt-2 border-t" dir="ltr" style={{ borderColor: `color-mix(in srgb, ${country.color} 15%, transparent)` }}>
        {country.coffee.transliteration && (
          <span className="text-sm md:text-base" style={{ color: country.color, opacity: 0.5 }}>
            {country.coffee.transliteration}
          </span>
        )}
        <Image
          src={`https://flagcdn.com/w40/${country.code}.png`}
          alt={`${country.name} flag`}
          width={20}
          height={14}
          className="rounded-sm"
          unoptimized
        />
        <span className="text-sm md:text-base font-medium" style={{ color: country.color, opacity: 0.6 }}>
          {country.name}
        </span>
      </div>
    </div>
  );
}

interface ScrollRowProps {
  items: CoffeeCountry[];
  direction: 'left' | 'right';
  duration: number;
}

function ScrollRow({ items, direction, duration }: ScrollRowProps) {
  const tripled = [...items, ...items, ...items];
  const animClass = direction === 'left' ? 'animate-scroll-left' : 'animate-scroll-right';

  return (
    <div className="overflow-hidden">
      <div
        className={`flex gap-4 ${animClass}`}
        style={{ animationDuration: `${duration}s` }}
      >
        {tripled.map((country, i) => (
          <CoffeeCard key={`${country.code}-${i}`} country={country} />
        ))}
      </div>
    </div>
  );
}

export function CoffeeAroundWorld() {
  const { ref: rowsRef, revealed: rowsRevealed } = useScrollReveal(0.1);

  return (
    <section
      className="py-16 md:py-24 lg:py-32 border-t border-border-default overflow-hidden"
      style={{ background: 'var(--surface-landing)' }}
    >
      <div
        ref={rowsRef}
        className="flex flex-col gap-4"
        style={{
          opacity: rowsRevealed ? 1 : 0,
          transform: rowsRevealed ? 'translateY(0)' : 'translateY(24px)',
          transition: 'opacity 0.7s ease-out, transform 0.7s ease-out',
        }}
      >
        <ScrollRow items={ROW_1} direction="left" duration={80} />
        <ScrollRow items={ROW_2} direction="right" duration={90} />
      </div>
    </section>
  );
}
