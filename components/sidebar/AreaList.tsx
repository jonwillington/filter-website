'use client';

import { useMemo } from 'react';
import { Shop, CityArea } from '@/lib/types';
import { ChevronRight } from 'lucide-react';

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

  // Group areas by their group field
  const areasByGroup = useMemo(() => {
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
    <div className="px-4 py-4" key={`areas-${animationKey}`}>
      {areasByGroup.map(([groupName, groupAreas], groupIndex) => (
        <div key={groupName || 'ungrouped'} className={groupIndex > 0 ? 'mt-6' : ''}>
          {groupName && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider whitespace-nowrap">
                {groupName}
              </span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
            </div>
          )}
          <div>
            {groupAreas.map((area, areaIndex) => {
              const animIndex = ++runningIndex;
              const isLast = areaIndex === groupAreas.length - 1;
              return (
                <button
                  key={area.id}
                  onClick={() => onAreaSelect(area.id, area.name)}
                  className={`w-full text-left py-3 group shop-card-animate ${!isLast ? 'border-b border-gray-100 dark:border-white/5' : ''}`}
                  style={{ animationDelay: `${(animIndex - 1) * 40}ms` }}
                >
                  <div className="flex items-baseline gap-3">
                    <span className="text-[1.75rem] font-medium text-primary leading-tight group-hover:text-amber-900 dark:group-hover:text-amber-700 transition-colors">
                      {area.name}
                    </span>
                    <span className="text-sm text-text-secondary">
                      {area.shopCount}
                    </span>
                    {area.hasTopPicks && (
                      <span className="text-xs text-amber-600 dark:text-amber-500 font-medium">
                        Top picks
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-text-secondary/50 ml-auto flex-shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
