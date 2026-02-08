'use client';

import { useMemo, useRef, useState, useEffect, useReducer, useCallback } from 'react';
import { Tooltip } from '@heroui/react';

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
  slotCount: number;
}

const ROW_CONFIGS: RowConfig[] = [
  { direction: 'left',  duration: 90,  slotCount: 4 },
  { direction: 'right', duration: 100, slotCount: 3 },
  { direction: 'left',  duration: 95,  slotCount: 3 },
]; // Total: 10 slots

const LOGO_SIZE = 72;

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
  primaryColor?: string;
  logos: BrandLogo[];
}

// Skeleton ghost group sizes — vary to look natural
const SKELETON_LOGOS_COUNTS = [5, 4, 6, 4, 5, 3, 5, 4, 6];

// --- Morph state model ---

interface MorphSlot {
  slotId: number;
  rowIndex: number;
  currentGroup: RowGroup;
  animState: 'visible' | 'fading-out' | 'fading-in';
  colorWashColor: string | null;
  colorWashActive: boolean;
}

interface MorphState {
  slots: MorphSlot[];
}

type MorphAction =
  | { type: 'INIT'; slots: MorphSlot[] }
  | { type: 'START_FADEOUT'; slotId: number }
  | { type: 'SWAP_GROUP'; slotId: number; newGroup: RowGroup }
  | { type: 'FINISH_FADEIN'; slotId: number }
  | { type: 'CLEAR_WASH'; slotId: number }
  | { type: 'REMOVE_WASH'; slotId: number };

function morphReducer(state: MorphState, action: MorphAction): MorphState {
  switch (action.type) {
    case 'INIT':
      return { slots: action.slots };

    case 'START_FADEOUT':
      return {
        slots: state.slots.map(s =>
          s.slotId === action.slotId ? { ...s, animState: 'fading-out' as const } : s
        ),
      };

    case 'SWAP_GROUP':
      return {
        slots: state.slots.map(s =>
          s.slotId === action.slotId
            ? {
                ...s,
                currentGroup: action.newGroup,
                animState: 'fading-in' as const,
                colorWashColor: action.newGroup.primaryColor || null,
                colorWashActive: !!action.newGroup.primaryColor,
              }
            : s
        ),
      };

    case 'FINISH_FADEIN':
      return {
        slots: state.slots.map(s =>
          s.slotId === action.slotId ? { ...s, animState: 'visible' as const } : s
        ),
      };

    case 'CLEAR_WASH':
      return {
        slots: state.slots.map(s =>
          s.slotId === action.slotId ? { ...s, colorWashActive: false } : s
        ),
      };

    case 'REMOVE_WASH':
      return {
        slots: state.slots.map(s =>
          s.slotId === action.slotId ? { ...s, colorWashColor: null } : s
        ),
      };

    default:
      return state;
  }
}

function buildInitialSlots(groups: LocationLogoGroup[]): { slots: MorphSlot[]; pool: RowGroup[] } {
  const shuffled = shuffleArray(groups);
  const totalSlots = ROW_CONFIGS.reduce((sum, r) => sum + r.slotCount, 0);

  const allGroups: RowGroup[] = shuffled.map(g => ({
    locationName: g.locationName,
    countryCode: g.countryCode,
    primaryColor: g.primaryColor,
    logos: shuffleArray(g.logos).slice(0, 8),
  }));

  const activeGroups = allGroups.slice(0, totalSlots);
  const poolGroups = allGroups.slice(totalSlots);

  const slots: MorphSlot[] = [];
  let groupIdx = 0;

  ROW_CONFIGS.forEach((rowConfig, rowIndex) => {
    for (let s = 0; s < rowConfig.slotCount; s++) {
      if (groupIdx < activeGroups.length) {
        slots.push({
          slotId: slots.length,
          rowIndex,
          currentGroup: activeGroups[groupIdx],
          animState: 'visible',
          colorWashColor: null,
          colorWashActive: false,
        });
        groupIdx++;
      }
    }
  });

  return { slots, pool: poolGroups };
}

export function BrandLogoCarousel({ logos, locationGroups, isLoading }: BrandLogoCarouselProps) {
  const isDev = process.env.NODE_ENV === 'development';

  // Morph state
  const [morphState, dispatch] = useReducer(morphReducer, { slots: [] });
  const slotsRef = useRef<MorphSlot[]>([]);
  // Keep ref in sync with latest state for use in stable callbacks
  slotsRef.current = morphState.slots;
  const poolRef = useRef<RowGroup[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const morphIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const morphingEnabledRef = useRef(false);

  // Build grouped rows (for non-morph fallback) or flat rows
  const groupedRows = useMemo(() => {
    if (locationGroups && locationGroups.length > 0) {
      return buildGroupedRows(locationGroups);
    }
    return null;
  }, [locationGroups]);

  const flatRows = useMemo(() => {
    if (groupedRows || isLoading || (locationGroups && locationGroups.length > 0)) return null;
    return buildFlatRows(logos, isDev);
  }, [groupedRows, isLoading, logos, isDev, locationGroups]);

  const hasContent = useMemo(() => {
    if (isLoading) return true;
    if (groupedRows) return true;
    if (locationGroups && locationGroups.length > 0) return true;
    if (isDev) return true;
    return logos.length >= 8;
  }, [isLoading, groupedRows, locationGroups, logos, isDev]);

  // Smooth crossfade: skeleton fades out while real groups fade in
  const hadGroupsOnMount = useRef(!!groupedRows);
  const [dataReady, setDataReady] = useState(hadGroupsOnMount.current);
  const [skeletonGone, setSkeletonGone] = useState(hadGroupsOnMount.current);

  // Reduced motion preference
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Initialize morph slots when location groups arrive
  useEffect(() => {
    if (!locationGroups || locationGroups.length === 0) return;

    const { slots, pool } = buildInitialSlots(locationGroups);
    dispatch({ type: 'INIT', slots });
    poolRef.current = pool;
    morphingEnabledRef.current = pool.length > 0;
  }, [locationGroups]);

  // Crossfade skeleton → real content
  useEffect(() => {
    if (hadGroupsOnMount.current) return;
    if (!locationGroups || locationGroups.length === 0) return;
    if (morphState.slots.length === 0) return;

    const raf = requestAnimationFrame(() => setDataReady(true));
    const cleanup = setTimeout(() => setSkeletonGone(true), 2000);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(cleanup);
    };
  }, [locationGroups, morphState.slots.length]);

  // Morph cycle — stable callback, reads from refs to avoid re-creating interval
  const doMorph = useCallback(() => {
    if (!morphingEnabledRef.current) return;
    if (poolRef.current.length === 0) return;

    // Read latest slots from ref (avoids stale closure)
    const currentSlots = slotsRef.current;
    const visibleSlots = currentSlots.filter(s => s.animState === 'visible');
    if (visibleSlots.length === 0) return;

    const target = visibleSlots[Math.floor(Math.random() * visibleSlots.length)];
    const slotId = target.slotId;

    // Take next group from pool (FIFO)
    const newGroup = poolRef.current.shift()!;
    // Push old group to back of pool
    poolRef.current.push(target.currentGroup);

    // t=0: start fadeout
    dispatch({ type: 'START_FADEOUT', slotId });

    // t=500ms: swap group data
    const t1 = setTimeout(() => {
      dispatch({ type: 'SWAP_GROUP', slotId, newGroup });
    }, 500);

    // t=1000ms: finish fade in (mark visible)
    const t2 = setTimeout(() => {
      dispatch({ type: 'FINISH_FADEIN', slotId });
    }, 1000);

    // t=3000ms: start fading wash out
    const t3 = setTimeout(() => {
      dispatch({ type: 'CLEAR_WASH', slotId });
    }, 3000);

    // t=5000ms: remove wash from DOM
    const t4 = setTimeout(() => {
      dispatch({ type: 'REMOVE_WASH', slotId });
    }, 5000);

    timersRef.current.push(t1, t2, t3, t4);
  }, []); // stable — no deps, reads from refs

  // Start morph interval after initial fade-in
  useEffect(() => {
    if (!dataReady) return;
    if (!morphingEnabledRef.current) return;
    if (prefersReducedMotion) return;

    // Wait 3s after initial reveal before starting morphs
    const startDelay = setTimeout(() => {
      // Do first morph immediately
      doMorph();

      morphIntervalRef.current = setInterval(() => {
        doMorph();
      }, 4000);
    }, 3000);

    timersRef.current.push(startDelay);

    return () => {
      clearTimeout(startDelay);
      if (morphIntervalRef.current) {
        clearInterval(morphIntervalRef.current);
        morphIntervalRef.current = null;
      }
    };
  }, [dataReady, prefersReducedMotion, doMorph]);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(t => clearTimeout(t));
      timersRef.current = [];
      if (morphIntervalRef.current) {
        clearInterval(morphIntervalRef.current);
      }
    };
  }, []);

  if (!hasContent) {
    return null;
  }

  const rowCount = ROW_CONFIGS.length;
  const isGroupedMode = isLoading || !!groupedRows || morphState.slots.length > 0;

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
            // Get slots for this row from morph state
            const rowSlots = morphState.slots.filter(s => s.rowIndex === rowIndex);
            // Fallback to old grouped rows if morph not initialized yet
            const fallbackGroups = groupedRows?.[rowIndex] || [];
            const hasRealContent = rowSlots.length > 0 || fallbackGroups.length > 0;

            return (
              <div key={rowIndex} className="overflow-hidden relative" style={{ height: `${LOGO_SIZE}px` }}>
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

                {/* Real content — morphing slots */}
                {hasRealContent && (
                  <MorphingRowInner
                    config={config}
                    slots={rowSlots}
                    fallbackGroups={fallbackGroups}
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
                      className="flex-shrink-0 rounded-full flex items-center justify-center border-2 border-white/10 dark:border-white/5"
                      style={{
                        width: `${LOGO_SIZE}px`,
                        height: `${LOGO_SIZE}px`,
                        ...(isPlaceholder ? { backgroundColor: devBgColor } : {}),
                      }}
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

/** Morphing grouped row — each slot can independently fade in/out */
function MorphingRowInner({
  config,
  slots,
  fallbackGroups,
  rowIndex,
  dataReady,
  rowCount,
}: {
  config: RowConfig;
  slots: MorphSlot[];
  fallbackGroups: RowGroup[];
  rowIndex: number;
  dataReady: boolean;
  rowCount: number;
}) {
  // Use morph slots if available, otherwise fall back to static groups
  const groups: Array<{ group: RowGroup; slotId?: number; animState?: MorphSlot['animState']; colorWashColor?: string | null; colorWashActive?: boolean }> =
    slots.length > 0
      ? slots.map(s => ({
          group: s.currentGroup,
          slotId: s.slotId,
          animState: s.animState,
          colorWashColor: s.colorWashColor,
          colorWashActive: s.colorWashActive,
        }))
      : fallbackGroups.map(g => ({ group: g }));

  // Triple for infinite scroll
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
      {tripled.map((item, gi) => {
        const origIdx = gi % groups.length;
        // Interleave across rows: column-first ordering for a cascading wave
        const globalIndex = origIdx * rowCount + rowIndex;
        const delay = globalIndex * 0.15;

        // Determine opacity based on morph state
        const isMorphing = item.animState !== undefined;
        let slotOpacity: number;
        if (!dataReady) {
          slotOpacity = 0; // Initial load — all hidden
        } else if (isMorphing && item.animState === 'fading-out') {
          slotOpacity = 0;
        } else {
          slotOpacity = 1;
        }

        // Transition: initial stagger on first load, fast transition for morphs
        const transition = !dataReady
          ? `opacity 1.4s ease-out ${delay}s`
          : 'opacity 0.5s ease-in-out';

        return (
          <div
            key={`slot-${item.slotId ?? origIdx}-copy-${gi}`}
            className="flex items-center gap-4 relative"
            style={{
              opacity: slotOpacity,
              transition,
            }}
          >
            {/* Color wash glow */}
            {item.colorWashColor && (
              <div
                className="absolute inset-0 -inset-x-4 -inset-y-2 pointer-events-none rounded-2xl"
                style={{
                  background: `radial-gradient(ellipse at center, ${item.colorWashColor}40 0%, transparent 70%)`,
                  opacity: item.colorWashActive ? 0.6 : 0,
                  transition: 'opacity 2s ease-out',
                }}
              />
            )}

            {/* Location chip */}
            <div className="flex-shrink-0 flex items-center gap-1.5">
              {item.group.countryCode && (
                <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0">
                  <img
                    src={FLAG_URL(item.group.countryCode)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <span className="text-base font-medium text-white/60 whitespace-nowrap">
                {item.group.locationName}
              </span>
              <span className="text-white/25 text-xs">→</span>
            </div>

            {/* Logos for this location */}
            {item.group.logos.map((logo, li) => (
              <Tooltip key={`${logo.name}-${li}`} content={logo.name} placement="bottom" delay={300} closeDelay={0}>
                <div
                  className="flex-shrink-0 rounded-full flex items-center justify-center border-2 border-white/10 dark:border-white/5"
                  style={{
                    width: `${LOGO_SIZE}px`,
                    height: `${LOGO_SIZE}px`,
                  }}
                >
                  <img
                    src={logo.logoUrl}
                    alt={logo.name}
                    className="w-full h-full object-cover rounded-full"
                    loading="lazy"
                  />
                </div>
              </Tooltip>
            ))}

            {/* Segment divider */}
            <span className="text-white/10 text-4xl font-extralight tracking-widest select-none flex-shrink-0" style={{ fontStyle: 'italic' }}>//</span>
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
                className="flex-shrink-0 rounded-full"
                style={{
                  width: `${LOGO_SIZE}px`,
                  height: `${LOGO_SIZE}px`,
                  background: 'rgba(255,255,255,0.05)',
                }}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

/** Build rows of grouped data: each row has multiple RowGroups (fallback for non-morph) */
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
      primaryColor: group.primaryColor,
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
