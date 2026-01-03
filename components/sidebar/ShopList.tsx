'use client';

import { useState } from 'react';
import { Shop } from '@/lib/types';
import { ShopCard } from './ShopCard';
import { ChevronDown } from 'lucide-react';

interface ShopListProps {
  shops: Shop[];
  selectedShop: Shop | null;
  onShopSelect: (shop: Shop) => void;
  isLoading?: boolean;
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

  // Group shops by area
  const shopsByArea = shops.reduce((acc, shop) => {
    const areaName = shop.city_area?.name ?? shop.cityArea?.name ?? 'Other';
    if (!acc[areaName]) acc[areaName] = [];
    acc[areaName].push(shop);
    return acc;
  }, {} as Record<string, Shop[]>);

  // Sort areas alphabetically
  const sortedAreas = Object.keys(shopsByArea).sort();

  // If only one area or no areas, show flat list
  const shouldUseAccordion = sortedAreas.length > 1;

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
        {sortedAreas.map((areaName) => (
          <div key={areaName}>
            <div className="py-1">
              {shopsByArea[areaName].map((shop) => (
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

  // All mode: show collapsible sections for each area
  return (
    <div
      className="transition-opacity duration-300"
      style={{ opacity: isLoading ? 0.4 : 1 }}
    >
      {sortedAreas.map((areaName) => (
        <AreaSection
          key={areaName}
          areaName={areaName}
          shops={shopsByArea[areaName]}
          selectedShop={selectedShop}
          onShopSelect={onShopSelect}
          isLoading={isLoading}
        />
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
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors"
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
