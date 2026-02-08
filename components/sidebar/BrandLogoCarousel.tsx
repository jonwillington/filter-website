'use client';

import { useMemo, useRef, useState, useEffect } from 'react';

export interface BrandLogo {
  name: string;
  logoUrl: string;
}

export interface LocationLogoGroup {
  locationName: string;
  countryCode?: string;
  primaryColor?: string;
  logos: BrandLogo[];
}

interface BrandLogoCarouselProps {
  logos: BrandLogo[];
  /** When provided, renders location chips interspersed with grouped logos */
  locationGroups?: LocationLogoGroup[];
  /** Show skeleton rows while data is loading */
  isLoading?: boolean;
}

interface RowConfig {
  direction: 'left' | 'right';
  duration: number;
}

const ROW_CONFIGS: RowConfig[] = [
  { direction: 'left', duration: 90 },
  { direction: 'right', duration: 100 },
  { direction: 'left', duration: 95 },
  { direction: 'right', duration: 85 },
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

const FLAG_URL = (code: string) => `https://flagcdn.com/w40/${code.toLowerCase()}.png`;

/** A rendered group: chip + its logos */
interface RowGroup {
  locationName: string;
  countryCode?: string;
  logos: BrandLogo[];
}

// Skeleton ghost group sizes — vary to look natural
const SKELETON_LOGOS_COUNTS = [5, 4, 6, 4, 5, 3, 5, 4, 6];

export function BrandLogoCarousel({ logos, locationGroups, isLoading }: BrandLogoCarouselProps) {
  const isDev = process.env.NODE_ENV === 'development';

  // Build grouped rows or flat rows
  const groupedRows = useMemo(() => {
    if (locationGroups && locationGroups.length > 0) {
      return buildGroupedRows(locationGroups);
    }
    return null;
  }, [locationGroups]);

  const flatRows = useMemo(() => {
    if (groupedRows || isLoading) return null;
    return buildFlatRows(logos, isDev);
  }, [groupedRows, isLoading, logos, isDev]);

  const hasContent = useMemo(() => {
    if (isLoading) return true;
    if (groupedRows) return true;
    if (isDev) return true;
    return logos.length >= 8;
  }, [isLoading, groupedRows, logos, isDev]);

  // Smooth crossfade: skeleton fades out while real groups fade in individually
  const hadGroupsOnMount = useRef(!!groupedRows);
  const [dataReady, setDataReady] = useState(hadGroupsOnMount.current);
  const [skeletonGone, setSkeletonGone] = useState(hadGroupsOnMount.current);

  useEffect(() => {
    if (hadGroupsOnMount.current) return;
    if (!groupedRows) return;

    // Wait one frame for real rows to render, then trigger transitions
    const raf = requestAnimationFrame(() => setDataReady(true));
    // Remove skeleton from DOM after crossfade completes
    const cleanup = setTimeout(() => setSkeletonGone(true), 2000);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(cleanup);
    };
  }, [groupedRows]);

  if (!hasContent) {
    return null;
  }

  const rowCount = ROW_CONFIGS.length;
  const isGroupedMode = isLoading || !!groupedRows;

  return (
    <div
      className="relative overflow-hidden py-3"
      aria-hidden="true"
    >
      {/* Gradient fade on left edge */}
      <div
        className="absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to right, var(--surface-warm), transparent)' }}
      />

      {/* Gradient fade on right edge */}
      <div
        className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left, var(--surface-warm), transparent)' }}
      />

      {/* Subtle top fade */}
      <div
        className="absolute left-0 right-0 top-0 h-8 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, var(--surface-warm), transparent)' }}
      />

      {/* Rows */}
      <div className="space-y-4">
        {Array.from({ length: rowCount }).map((_, rowIndex) => {
          const config = ROW_CONFIGS[rowIndex];

          if (isGroupedMode) {
            const groups = groupedRows?.[rowIndex] || [];
            const hasRealContent = groups.length > 0;

            return (
              <div key={rowIndex} className="overflow-hidden relative" style={{ height: '56px' }}>
                {/* Skeleton layer — crossfades out */}
                {!skeletonGone && (
                  <div
                    className="absolute inset-0"
                    style={{
                      opacity: dataReady ? 0 : 1,
                      transition: 'opacity 0.8s ease-out',
                      pointerEvents: 'none',
                    }}
                  >
                    <SkeletonRowInner config={config} rowIndex={rowIndex} />
                  </div>
                )}

                {/* Real content — groups fade in individually */}
                {hasRealContent && (
                  <GroupedRowInner
                    config={config}
                    groups={groups}
                    rowIndex={rowIndex}
                    dataReady={dataReady}
                    rowCount={rowCount}
                  />
                )}
              </div>
            );
          }

          // Flat mode (legacy)
          const items = flatRows?.[rowIndex] || [];
          const tripled = [...items, ...items, ...items];

          return (
            <div key={rowIndex} className="overflow-hidden">
              <div
                className={`flex items-center gap-4 ${
                  config.direction === 'left'
                    ? 'animate-scroll-left'
                    : 'animate-scroll-right'
                }`}
                style={{
                  animationDuration: `${config.duration}s`,
                  width: 'max-content',
                }}
              >
                {tripled.map((logo, li) => {
                  const isPlaceholder = !logo.logoUrl;
                  const devBgColor = isPlaceholder ? DEV_COLORS[(rowIndex * 7 + li) % DEV_COLORS.length] : undefined;

                  return (
                    <div
                      key={`${logo.name}-${li}`}
                      className="flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center border-2 border-white/10 dark:border-white/5"
                      style={isPlaceholder ? { backgroundColor: devBgColor } : undefined}
                    >
                      {!isPlaceholder && (
                        <img
                          src={logo.logoUrl}
                          alt=""
                          className="w-full h-full object-cover rounded-full"
                          loading="lazy"
                        />
                      )}
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

/** Real grouped row — each group fades in with a staggered delay */
function GroupedRowInner({
  config,
  groups,
  rowIndex,
  dataReady,
  rowCount,
}: {
  config: RowConfig;
  groups: RowGroup[];
  rowIndex: number;
  dataReady: boolean;
  rowCount: number;
}) {
  const tripled = [...groups, ...groups, ...groups];

  return (
    <div
      className={`flex items-center gap-10 ${
        config.direction === 'left'
          ? 'animate-scroll-left'
          : 'animate-scroll-right'
      }`}
      style={{
        animationDuration: `${config.duration}s`,
        width: 'max-content',
      }}
    >
      {tripled.map((group, gi) => {
        const origIdx = gi % groups.length;
        // Interleave across rows: column-first ordering for a cascading wave
        const globalIndex = origIdx * rowCount + rowIndex;
        const delay = globalIndex * 0.15;

        return (
          <div
            key={`${group.locationName}-${gi}`}
            className="flex items-center gap-4"
            style={{
              opacity: dataReady ? 1 : 0,
              transition: `opacity 1.4s ease-out ${delay}s`,
            }}
          >
            {/* Location chip */}
            <div className="flex-shrink-0 flex items-center gap-1.5">
              {group.countryCode && (
                <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0">
                  <img
                    src={FLAG_URL(group.countryCode)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <span className="text-xs font-medium text-white/60 whitespace-nowrap">
                {group.locationName}
              </span>
              <span className="text-white/25 text-xs">→</span>
            </div>

            {/* Logos for this location */}
            {group.logos.map((logo, li) => (
              <div
                key={`${logo.name}-${li}`}
                className="flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center border-2 border-white/10 dark:border-white/5"
              >
                <img
                  src={logo.logoUrl}
                  alt=""
                  className="w-full h-full object-cover rounded-full"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/** Skeleton row inner: scrolling ghost groups */
function SkeletonRowInner({ config, rowIndex }: { config: RowConfig; rowIndex: number }) {
  const ghostGroups = 9;

  return (
    <div
      className={`flex items-center gap-10 ${
        config.direction === 'left'
          ? 'animate-scroll-left'
          : 'animate-scroll-right'
      }`}
      style={{
        animationDuration: `${config.duration}s`,
        width: 'max-content',
      }}
    >
      {Array.from({ length: ghostGroups }).map((_, gi) => {
        const logoCount = SKELETON_LOGOS_COUNTS[(rowIndex * 3 + gi) % SKELETON_LOGOS_COUNTS.length];

        return (
          <div key={gi} className="flex items-center gap-4">
            {/* Ghost location chip */}
            <div className="flex-shrink-0 flex items-center gap-1.5">
              <div
                className="w-5 h-5 rounded-full flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              />
              <div
                className="h-3 w-14 rounded"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              />
              <div
                className="h-3 w-2 rounded"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              />
            </div>

            {/* Ghost logo circles */}
            {Array.from({ length: logoCount }).map((_, li) => (
              <div
                key={li}
                className="flex-shrink-0 w-14 h-14 rounded-full"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

/** Build rows of grouped data: each row has multiple RowGroups */
function buildGroupedRows(groups: LocationLogoGroup[]): RowGroup[][] {
  const shuffled = shuffleArray(groups);
  const rowCount = ROW_CONFIGS.length;
  const rows: RowGroup[][] = Array.from({ length: rowCount }, () => []);

  shuffled.forEach((group, groupIndex) => {
    const rowIndex = groupIndex % rowCount;
    const groupLogos = shuffleArray(group.logos).slice(0, 8);
    rows[rowIndex].push({
      locationName: group.locationName,
      countryCode: group.countryCode,
      logos: groupLogos,
    });
  });

  return rows;
}

/** Legacy flat mode: distribute shuffled logos across rows */
function buildFlatRows(logos: BrandLogo[], isDev: boolean): BrandLogo[][] {
  let effectiveLogos = logos;
  if (isDev && logos.length < 8) {
    effectiveLogos = Array.from({ length: 40 }, (_, i) => ({
      name: `Brand ${i + 1}`,
      logoUrl: '',
    }));
  }

  const shuffled = shuffleArray(effectiveLogos);
  const rowCount = ROW_CONFIGS.length;
  const rows: BrandLogo[][] = Array.from({ length: rowCount }, () => []);

  shuffled.forEach((logo, index) => {
    rows[index % rowCount].push(logo);
  });

  return rows;
}
