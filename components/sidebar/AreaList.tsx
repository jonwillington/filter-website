'use client';

import { useMemo, useState } from 'react';
import { Shop, CityArea } from '@/lib/types';
import { ChevronRight } from 'lucide-react';

const COLLAPSED_LIMIT = 9;

interface AreaListProps {
  shops: Shop[];
  onAreaSelect: (areaId: string, areaName: string) => void;
  /** Key to trigger stagger animation - change this value to re-animate */
  animationKey?: number;
}

interface AreaItem {
  id: string;
  name: string;
  group: string | null;
  shopCount: number;
  hasTopPicks: boolean;
}

export function AreaList({ shops, onAreaSelect, animationKey = 0 }: AreaListProps) {
  // Group shops by area and count
  const areas = useMemo(() => {
    const areaMap = new Map<string, AreaItem>();

    shops.forEach((shop) => {
      const cityArea = shop.city_area ?? (shop as any).cityArea;
      if (!cityArea?.documentId) return; // Skip shops without area

      const areaId = cityArea.documentId;
      const areaName = cityArea.name ?? 'Other';
      const group = cityArea.group ?? null;

      if (!areaMap.has(areaId)) {
        areaMap.set(areaId, {
          id: areaId,
          name: areaName,
          group,
          shopCount: 0,
          hasTopPicks: false,
        });
      }

      const area = areaMap.get(areaId)!;
      area.shopCount++;

      // Check if shop is a top pick
      const anyShop = shop as any;
      if (anyShop.cityAreaRec === true || anyShop.city_area_rec === true || anyShop.cityarearec === true) {
        area.hasTopPicks = true;
      }
    });

    return Array.from(areaMap.values());
  }, [shops]);

  // Group areas by their group field, but only if there are 7+ areas
  const areasByGroup = useMemo(() => {
    // For fewer than 7 areas, show a single flat alphabetical list
    if (areas.length < 7) {
      const sorted = [...areas].sort((a, b) => a.name.localeCompare(b.name));
      return [['', sorted]] as [string, AreaItem[]][];
    }

    const groupMap = new Map<string, AreaItem[]>();

    areas.forEach((area) => {
      const groupName = area.group || '';
      if (!groupMap.has(groupName)) {
        groupMap.set(groupName, []);
      }
      groupMap.get(groupName)!.push(area);
    });

    // Sort areas within each group alphabetically
    groupMap.forEach((groupAreas) => {
      groupAreas.sort((a, b) => a.name.localeCompare(b.name));
    });

    // Sort groups alphabetically, with empty group last
    const sortedGroups = Array.from(groupMap.entries()).sort(([a], [b]) => {
      if (a === '') return 1;
      if (b === '') return -1;
      return a.localeCompare(b);
    });

    return sortedGroups;
  }, [areas]);

  // If no areas found from shops, show nothing
  if (areas.length === 0) {
    return null;
  }

  // Calculate running animation index across all groups
  let runningIndex = 0;

  return (
    <div className="px-4 py-3" key={`areas-${animationKey}`}>
      {areasByGroup.map(([groupName, groupAreas], groupIndex) => (
        <AreaGroup
          key={groupName || 'ungrouped'}
          groupName={groupName}
          areas={groupAreas}
          onAreaSelect={onAreaSelect}
          startIndex={groupIndex === 0 ? 0 : areasByGroup.slice(0, groupIndex).reduce((sum, [, g]) => sum + g.length, 0)}
          isFirst={groupIndex === 0}
        />
      ))}
    </div>
  );
}

function AreaGroup({
  groupName,
  areas,
  onAreaSelect,
  startIndex,
  isFirst,
}: {
  groupName: string;
  areas: AreaItem[];
  onAreaSelect: (areaId: string, areaName: string) => void;
  startIndex: number;
  isFirst: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const needsCollapse = areas.length > COLLAPSED_LIMIT;
  const visibleAreas = expanded ? areas : areas.slice(0, COLLAPSED_LIMIT);
  const hiddenCount = areas.length - COLLAPSED_LIMIT;

  return (
    <div className={isFirst ? '' : 'mt-3'}>
      <div className="rounded-xl bg-black/[0.03] dark:bg-white/[0.04] p-3">
        {groupName && (
          <span className="text-[11px] font-normal text-text-secondary/30 uppercase tracking-widest mb-3 block">
            {groupName}
          </span>
        )}
        <div className="flex flex-wrap gap-2">
          {visibleAreas.map((area, i) => (
            <button
              key={area.id}
              onClick={() => onAreaSelect(area.id, area.name)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-white dark:bg-white/10 border border-border-default text-primary hover:border-accent hover:text-accent transition-colors shop-card-animate"
              style={{ animationDelay: `${(startIndex + i) * 40}ms` }}
            >
              {area.name}
              <span className="text-xs text-text-secondary/50">{area.shopCount}</span>
              <ChevronRight className="w-3 h-3 text-text-secondary/40" />
            </button>
          ))}
          {needsCollapse && !expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium text-accent hover:text-accent/80 transition-colors"
            >
              +{hiddenCount} more
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
