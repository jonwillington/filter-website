'use client';

import { Shop } from '@/lib/types';
import { ShopCard } from './ShopCard';
import { Accordion, AccordionItem } from '@heroui/react';

interface ShopListProps {
  shops: Shop[];
  selectedShop: Shop | null;
  onShopSelect: (shop: Shop) => void;
  isLoading?: boolean;
  showTopRecommendations?: boolean;
  locationName?: string;
}

export function ShopList({
  shops,
  selectedShop,
  onShopSelect,
  isLoading,
  showTopRecommendations = false,
  locationName,
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
  const shouldUseAccordion = sortedAreas.length > 1 && !showTopRecommendations;

  // Top Picks mode or single area: show flat list with simple headers
  if (showTopRecommendations || !shouldUseAccordion) {
    return (
      <div
        className="transition-opacity duration-300"
        style={{ opacity: isLoading ? 0.4 : 1 }}
      >
        {locationName && (
          <div className="px-4 py-3 bg-surface/50 border-b border-border">
            <p className="text-xs text-textSecondary leading-snug">
              Our top recommendations from all the coffee shops in {locationName}
            </p>
          </div>
        )}
        {sortedAreas.map((areaName) => (
          <div key={areaName}>
            {areaName !== 'Other' && (
              <div className="area-header">
                <h3 className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
                  {areaName}
                </h3>
              </div>
            )}
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

  // All mode: show accordion for easy navigation between areas
  return (
    <div
      className="transition-opacity duration-300 px-2 py-4"
      style={{ opacity: isLoading ? 0.4 : 1 }}
    >
      <Accordion
        variant="splitted"
        selectionMode="multiple"
        defaultExpandedKeys={[]}
        className="px-0"
      >
        {sortedAreas.map((areaName) => (
          <AccordionItem
            key={areaName}
            aria-label={areaName}
            title={
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">
                  {areaName}
                </span>
                <span className="text-xs text-textSecondary">
                  {shopsByArea[areaName].length} {shopsByArea[areaName].length === 1 ? 'shop' : 'shops'}
                </span>
              </div>
            }
            classNames={{
              base: "mb-2",
              title: "text-sm font-medium",
              trigger: "py-2.5 px-3",
              content: "pb-2 pt-0 px-0",
            }}
          >
            <div className="space-y-1">
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
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
