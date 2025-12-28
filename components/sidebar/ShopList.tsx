'use client';

import { Shop } from '@/lib/types';
import { ShopCard } from './ShopCard';

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
  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="skeleton h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  if (shops.length === 0) {
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

  return (
    <div>
      {sortedAreas.map((areaName) => (
        <div key={areaName}>
          <div className="area-header">
            <h3 className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
              {areaName}
            </h3>
          </div>
          <div className="py-1">
            {shopsByArea[areaName].map((shop) => (
              <ShopCard
                key={shop.documentId}
                shop={shop}
                isSelected={selectedShop?.documentId === shop.documentId}
                onClick={() => onShopSelect(shop)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
