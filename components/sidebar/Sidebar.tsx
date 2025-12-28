'use client';

import { LocationSelector } from './LocationSelector';
import { ShopList } from './ShopList';
import { Location, Shop } from '@/lib/types';
import { cn } from '@/lib/utils';

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
