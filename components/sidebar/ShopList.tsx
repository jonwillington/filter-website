'use client';

import { useState, useMemo } from 'react';
import { Shop } from '@/lib/types';
import { ShopCard } from './ShopCard';
import { ChevronDown } from 'lucide-react';

interface ShopListProps {
  shops: Shop[];
  selectedShop: Shop | null;
  onShopSelect: (shop: Shop) => void;
  isLoading?: boolean;
}

interface AreaWithGroup {
  name: string;
  group: string | null;
  shops: Shop[];
}

export function ShopList({
  shops,
  selectedShop,
  onShopSelect,
  isLoading,
}: ShopListProps) {
  if (shops.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <div>
          <p className="text-textSecondary mb-2">No coffee shops found</p>
          <p className="text-sm text-textSecondary">
            Try selecting a different location
          </p>
        </div>
      </div>
    );
  }

  // Group shops by area, preserving the group info
  const areasWithGroups = useMemo(() => {
    const areaMap = new Map<string, AreaWithGroup>();

    shops.forEach((shop) => {
      const cityArea = shop.city_area ?? shop.cityArea;
      const areaName = cityArea?.name ?? 'Other';
      const group = cityArea?.group ?? null;

      if (!areaMap.has(areaName)) {
        areaMap.set(areaName, { name: areaName, group, shops: [] });
      }
      areaMap.get(areaName)!.shops.push(shop);
    });

    return Array.from(areaMap.values());
  }, [shops]);

  // Group areas by their group field
  const areasByGroup = useMemo(() => {
    const groupMap = new Map<string, AreaWithGroup[]>();

    areasWithGroups.forEach((area) => {
      const groupName = area.group || '';
      if (!groupMap.has(groupName)) {
        groupMap.set(groupName, []);
      }
      groupMap.get(groupName)!.push(area);
    });

    // Sort areas within each group alphabetically
    groupMap.forEach((areas) => {
      areas.sort((a, b) => a.name.localeCompare(b.name));
    });

    // Sort groups alphabetically, with empty group last
    const sortedGroups = Array.from(groupMap.entries()).sort(([a], [b]) => {
      if (a === '') return 1;
      if (b === '') return -1;
      return a.localeCompare(b);
    });

    return sortedGroups;
  }, [areasWithGroups]);

  // If only one area, show flat list
  const shouldUseAccordion = areasWithGroups.length > 1;

  // Single area: show flat list with simple headers
  if (!shouldUseAccordion) {
    return (
      <div
        className="transition-opacity duration-300"
        style={{ opacity: isLoading ? 0.4 : 1 }}
      >
        <div className="area-header">
          <h3 className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
            All shops
          </h3>
        </div>
        {areasWithGroups.map((area) => (
          <div key={area.name}>
            <div className="py-1">
              {area.shops.map((shop) => (
                <ShopCard
                  key={shop.documentId}
                  shop={shop}
                  isSelected={selectedShop?.documentId === shop.documentId}
                  onClick={() => onShopSelect(shop)}
                  disabled={isLoading}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Multiple areas: show grouped sections
  return (
    <div
      className="transition-opacity duration-300"
      style={{ opacity: isLoading ? 0.4 : 1 }}
    >
      {areasByGroup.map(([groupName, areas], index) => (
        <div key={groupName || 'ungrouped'} className={index > 0 ? 'mt-6' : ''}>
          {groupName && (
            <div className="px-4 pt-4 pb-2">
              <h4 className="text-[10px] font-medium text-gray-400 dark:text-white/30 uppercase tracking-wider">
                {groupName}
              </h4>
            </div>
          )}
          {areas.map((area) => (
            <AreaSection
              key={area.name}
              areaName={area.name}
              shops={area.shops}
              selectedShop={selectedShop}
              onShopSelect={onShopSelect}
              isLoading={isLoading}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Collapsible area section component
function AreaSection({
  areaName,
  shops,
  selectedShop,
  onShopSelect,
  isLoading,
}: {
  areaName: string;
  shops: Shop[];
  selectedShop: Shop | null;
  onShopSelect: (shop: Shop) => void;
  isLoading?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border-b border-gray-200 dark:border-white/5 last:border-b-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
      >
        <span className="text-sm font-medium text-text">{areaName}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-textSecondary">
            {shops.length}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-textSecondary transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </div>
      </button>
      {isExpanded && (
        <div className="pb-1">
          {shops.map((shop) => (
            <ShopCard
              key={shop.documentId}
              shop={shop}
              isSelected={selectedShop?.documentId === shop.documentId}
              onClick={() => onShopSelect(shop)}
              disabled={isLoading}
            />
          ))}
        </div>
      )}
    </div>
  );
}
