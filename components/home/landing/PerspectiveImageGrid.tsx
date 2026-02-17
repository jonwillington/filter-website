'use client';

import Image from 'next/image';
import { useMemo } from 'react';

// --- Public data interfaces ---

export interface GridTile {
  imageUrl: string;
  shopName: string;
  brandLogoUrl?: string;
}

export interface LocationImageGroup {
  locationName: string;
  countryCode?: string;
  tiles: GridTile[];
  brandLogos: string[];
  shopCoords: [number, number][];
  shopCount: number;
}

interface PerspectiveImageGridProps {
  imageGroups: LocationImageGroup[];
}

// Size tier based on shop count
type SizeTier = 'xl' | 'lg' | 'md' | 'sm';

function getSizeTier(shopCount: number): SizeTier {
  if (shopCount >= 25) return 'xl';
  if (shopCount >= 15) return 'lg';
  if (shopCount >= 8) return 'md';
  return 'sm';
}

// Grid span config per tier
const TIER_CONFIG: Record<SizeTier, { colSpan: number; rowSpan: number; logoSize: number; maxLogos: number; nameClass: string }> = {
  xl: { colSpan: 2, rowSpan: 2, logoSize: 36, maxLogos: 12, nameClass: 'text-4xl md:text-5xl' },
  lg: { colSpan: 2, rowSpan: 1, logoSize: 32, maxLogos: 8, nameClass: 'text-3xl' },
  md: { colSpan: 1, rowSpan: 1, logoSize: 28, maxLogos: 6, nameClass: 'text-2xl' },
  sm: { colSpan: 1, rowSpan: 1, logoSize: 24, maxLogos: 4, nameClass: 'text-lg' },
};

// Place groups into a grid, filling columns left-to-right
function layoutGrid(groups: LocationImageGroup[], cols: number) {
  // Sort: largest first for better packing
  const sorted = [...groups].sort((a, b) => b.shopCount - a.shopCount);

  // Track height of each column (in row units)
  const colHeights = new Array(cols).fill(0);

  const placed: {
    group: LocationImageGroup;
    tier: SizeTier;
    col: number;
    row: number;
    colSpan: number;
    rowSpan: number;
  }[] = [];

  for (const group of sorted) {
    const tier = getSizeTier(group.shopCount);
    const config = TIER_CONFIG[tier];
    const span = Math.min(config.colSpan, cols);
    const rowSpan = config.rowSpan;

    // Find the best starting column (shortest column that fits the span)
    let bestCol = 0;
    let bestHeight = Infinity;

    for (let c = 0; c <= cols - span; c++) {
      const maxH = Math.max(...colHeights.slice(c, c + span));
      if (maxH < bestHeight) {
        bestHeight = maxH;
        bestCol = c;
      }
    }

    placed.push({
      group,
      tier,
      col: bestCol + 1, // CSS grid is 1-indexed
      row: bestHeight + 1,
      colSpan: span,
      rowSpan,
    });

    // Update column heights
    for (let c = bestCol; c < bestCol + span; c++) {
      colHeights[c] = bestHeight + rowSpan;
    }
  }

  const totalRows = Math.max(...colHeights);
  return { placed, totalRows };
}

const ROW_HEIGHT = 140; // px per grid row unit

export function PerspectiveImageGrid({ imageGroups }: PerspectiveImageGridProps) {
  const cols = 5;

  const { placed, totalRows } = useMemo(
    () => layoutGrid(imageGroups, cols),
    [imageGroups]
  );

  if (imageGroups.length === 0) return null;

  const gridHeight = totalRows * ROW_HEIGHT;

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Slow vertical scroll — content duplicated for seamless loop */}
      <div
        className="animate-masonry-scroll"
        style={{
          willChange: 'transform',
        }}
      >
        {[0, 1, 2].map((copy) => (
          <div
            key={copy}
            className="grid gap-0"
            style={{
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gridAutoRows: `${ROW_HEIGHT}px`,
              height: gridHeight,
            }}
          >
            {placed.map(({ group, tier, col, row, colSpan, rowSpan }) => (
              <MasonryCell
                key={`${copy}-${group.locationName}`}
                group={group}
                tier={tier}
                style={{
                  gridColumn: `${col} / span ${colSpan}`,
                  gridRow: `${row} / span ${rowSpan}`,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Individual masonry cell ──────────────────────────────────────

function MasonryCell({
  group,
  tier,
  style,
}: {
  group: LocationImageGroup;
  tier: SizeTier;
  style: React.CSSProperties;
}) {
  const config = TIER_CONFIG[tier];
  const logos = group.brandLogos.slice(0, config.maxLogos);

  return (
    <div
      className="relative border-[0.5px] border-white/[0.06] overflow-hidden flex flex-col justify-between p-4"
      style={style}
    >
      {/* Location name */}
      <div>
        <p className={`font-display ${config.nameClass} leading-[0.92] text-white/30 break-words`}>
          {group.locationName}
        </p>
      </div>

      {/* Bottom: count + logos */}
      <div className="flex items-end justify-between gap-2 mt-2">
        <p className="text-[10px] tracking-[0.2em] uppercase text-white/15 tabular-nums font-mono whitespace-nowrap">
          {group.shopCount}
        </p>

        {logos.length > 0 && (
          <div className="flex items-center flex-wrap justify-end gap-1">
            {logos.map((url, i) => (
              <div
                key={i}
                className="rounded-full overflow-hidden opacity-40 flex-shrink-0"
                style={{
                  width: config.logoSize,
                  height: config.logoSize,
                }}
              >
                <Image
                  src={url}
                  alt=""
                  width={config.logoSize}
                  height={config.logoSize}
                  className="w-full h-full object-cover rounded-full"
                  loading="lazy"
                  sizes={`${config.logoSize}px`}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
