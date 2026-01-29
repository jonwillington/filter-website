'use client';

import { useMemo } from 'react';

export interface BrandLogo {
  name: string;
  logoUrl: string;
}

interface BrandLogoCarouselProps {
  logos: BrandLogo[];
}

interface RowConfig {
  direction: 'left' | 'right';
  duration: number;
}

const ROW_CONFIGS: RowConfig[] = [
  { direction: 'left', duration: 45 },
  { direction: 'right', duration: 52 },
  { direction: 'left', duration: 48 },
  { direction: 'right', duration: 42 },
];

// Dev mode: random pastel colors for visualization
const DEV_COLORS = [
  '#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF',
  '#E0BBE4', '#957DAD', '#D291BC', '#FEC8D8', '#FFDFD3',
  '#B5EAD7', '#C7CEEA', '#FF9AA2', '#FFB7B2', '#FFDAC1',
  '#E2F0CB', '#B5EAD7', '#C7CEEA', '#F0E6EF', '#D4A5A5',
];

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function BrandLogoCarousel({ logos }: BrandLogoCarouselProps) {
  const isDev = process.env.NODE_ENV === 'development';

  // In dev mode, generate placeholder logos if we don't have enough
  const effectiveLogos = useMemo(() => {
    if (isDev && logos.length < 8) {
      const placeholders: BrandLogo[] = Array.from({ length: 40 }, (_, i) => ({
        name: `Brand ${i + 1}`,
        logoUrl: '',
      }));
      return placeholders;
    }
    return logos;
  }, [logos, isDev]);

  // Shuffle and distribute logos across 4 rows
  // IMPORTANT: This hook must run before any early returns to maintain consistent hook count
  const rows = useMemo(() => {
    const shuffled = shuffleArray(effectiveLogos);
    const rowCount = 4;
    const result: BrandLogo[][] = Array.from({ length: rowCount }, () => []);

    shuffled.forEach((logo, index) => {
      result[index % rowCount].push(logo);
    });

    return result;
  }, [effectiveLogos]);

  // Need at least 8 logos for a good visual (skip check in dev)
  // This check must be AFTER all hooks to maintain consistent hook count
  if (!isDev && effectiveLogos.length < 8) {
    return null;
  }

  return (
    <div
      className="relative overflow-hidden py-4"
      aria-hidden="true"
    >
      {/* Gradient fade on left edge */}
      <div
        className="absolute left-0 top-0 bottom-0 w-12 z-10 pointer-events-none"
        style={{
          background: 'linear-gradient(to right, var(--surface-warm), transparent)',
        }}
      />

      {/* Gradient fade on right edge */}
      <div
        className="absolute right-0 top-0 bottom-0 w-12 z-10 pointer-events-none"
        style={{
          background: 'linear-gradient(to left, var(--surface-warm), transparent)',
        }}
      />

      {/* Gradient fade on bottom edge */}
      <div
        className="absolute left-0 right-0 bottom-0 h-16 z-10 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, var(--surface-warm), transparent)',
        }}
      />

      {/* Logo rows */}
      <div className="space-y-3">
        {rows.map((rowLogos, rowIndex) => {
          const config = ROW_CONFIGS[rowIndex];
          // Duplicate logos for seamless loop
          const duplicatedLogos = [...rowLogos, ...rowLogos];

          return (
            <div key={rowIndex} className="overflow-hidden">
              <div
                className={`flex gap-4 ${
                  config.direction === 'left'
                    ? 'animate-scroll-left'
                    : 'animate-scroll-right'
                }`}
                style={{
                  animationDuration: `${config.duration}s`,
                  width: 'max-content',
                }}
              >
                {duplicatedLogos.map((logo, logoIndex) => {
                  const isDev = process.env.NODE_ENV === 'development';
                  const devBgColor = isDev ? DEV_COLORS[(rowIndex * 7 + logoIndex) % DEV_COLORS.length] : undefined;

                  return (
                    <div
                      key={`${logo.name}-${logoIndex}`}
                      className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-white dark:bg-white/10 shadow-sm"
                      style={isDev ? { backgroundColor: devBgColor } : undefined}
                    >
                      <img
                        src={logo.logoUrl}
                        alt=""
                        className="w-8 h-8 object-contain rounded-full"
                        loading="lazy"
                        style={isDev ? { display: 'none' } : undefined}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
