'use client';

import { LocationSelector } from './LocationSelector';
import { ShopList } from './ShopList';
import { Location, Shop } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Switch } from '@heroui/react';

interface SidebarProps {
  locations: Location[];
  selectedLocation: Location | null;
  onLocationChange: (location: Location | null) => void;
  shops: Shop[];
  selectedShop: Shop | null;
  onShopSelect: (shop: Shop) => void;
  isNearbyMode: boolean;
  onNearbyToggle: () => void;
  isLoading?: boolean;
  isOpen?: boolean;
  showTopRecommendations?: boolean;
  onTopRecommendationsChange?: (value: boolean) => void;
}

export function Sidebar({
  locations,
  selectedLocation,
  onLocationChange,
  shops,
  selectedShop,
  onShopSelect,
  isNearbyMode,
  onNearbyToggle,
  isLoading,
  isOpen = true,
  showTopRecommendations = false,
  onTopRecommendationsChange,
}: SidebarProps) {
  return (
    <aside className={cn('sidebar', isOpen && 'open')}>
      <div className="sidebar-header">
        <h1 className="text-2xl font-bold text-contrastBlock mb-4">Filter</h1>
        <LocationSelector
          locations={locations}
          selectedLocation={selectedLocation}
          onLocationChange={onLocationChange}
          isNearbyMode={isNearbyMode}
          onNearbyToggle={onNearbyToggle}
        />
        {selectedLocation && onTopRecommendationsChange && (
          <div className="mt-4 flex items-center justify-between py-2 px-1">
            <span className="text-sm text-textSecondary">
              Only show top recommendations
            </span>
            <Switch
              size="sm"
              isSelected={showTopRecommendations}
              onValueChange={onTopRecommendationsChange}
              classNames={{
                wrapper: 'group-data-[selected=true]:bg-accent',
              }}
            />
          </div>
        )}
      </div>

      <div className="sidebar-content">
        <ShopList
          shops={shops}
          selectedShop={selectedShop}
          onShopSelect={onShopSelect}
          isLoading={isLoading}
        />
      </div>
    </aside>
  );
}
