'use client';

import { LocationSelector } from './LocationSelector';
import { ShopList } from './ShopList';
import { Location, Shop } from '@/lib/types';
import { cn } from '@/lib/utils';
import { SegmentedControl } from '../ui/SegmentedControl';
import { useMemo, ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@heroui/react';
import { Map } from 'lucide-react';

interface SidebarProps {
  locations: Location[];
  selectedLocation: Location | null;
  onLocationChange: (location: Location | null) => void;
  shops: Shop[];
  allShops?: Shop[]; // Unfiltered shops for counting
  selectedShop: Shop | null;
  onShopSelect: (shop: Shop) => void;
  isNearbyMode: boolean;
  onNearbyToggle: () => void;
  isLoading?: boolean;
  isOpen?: boolean;
  showTopRecommendations?: boolean;
  onTopRecommendationsChange?: (value: boolean) => void;
  isAreaUnsupported?: boolean;
  authComponent?: ReactNode;
  onOpenCityGuide?: () => void;
}

export function Sidebar({
  locations,
  selectedLocation,
  onLocationChange,
  shops,
  allShops,
  selectedShop,
  onShopSelect,
  isNearbyMode,
  onNearbyToggle,
  isLoading,
  isOpen = true,
  showTopRecommendations = false,
  onTopRecommendationsChange,
  isAreaUnsupported = false,
  authComponent,
  onOpenCityGuide,
}: SidebarProps) {
  // Count shops for segmented control labels
  const { topPicksCount, allCount } = useMemo(() => {
    const shopsToCount = allShops || shops;
    const allCount = shopsToCount.length;
    const topPicksCount = shopsToCount.filter((shop) => {
      const anyShop = shop as any;
      return (
        anyShop.cityAreaRec === true ||
        anyShop.city_area_rec === true ||
        anyShop.cityarearec === true
      );
    }).length;

    return { topPicksCount, allCount };
  }, [allShops, shops]);

  // Only show segmented control when there are enough shops and some are top picks
  const shouldShowSegments = selectedLocation && onTopRecommendationsChange && allCount >= 5 && topPicksCount > 0;

  return (
    <aside className={cn('sidebar', isOpen && 'open')}>
      <div className="sidebar-header">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-contrastBlock">Filter</h1>
          {authComponent && <div className="auth-in-sidebar">{authComponent}</div>}
        </div>
        <LocationSelector
          locations={locations}
          selectedLocation={selectedLocation}
          onLocationChange={onLocationChange}
          isNearbyMode={isNearbyMode}
          onNearbyToggle={onNearbyToggle}
        />
        {shouldShowSegments && (
          <div className="mt-4">
            <SegmentedControl
              segments={[
                { key: 'topPicks', label: `Top Picks (${topPicksCount})` },
                { key: 'all', label: `All (${allCount})` },
              ]}
              activeSegment={showTopRecommendations ? 'topPicks' : 'all'}
              onSegmentChange={(key) => onTopRecommendationsChange(key === 'topPicks')}
            />
          </div>
        )}
        {selectedLocation && onOpenCityGuide && (
          <div className="mt-4 lg:hidden">
            <Button
              onPress={onOpenCityGuide}
              variant="flat"
              color="primary"
              fullWidth
              startContent={<Map className="w-4 h-4" />}
              size="sm"
            >
              See City Guide
            </Button>
          </div>
        )}
      </div>

      <div className="sidebar-content">
        {isAreaUnsupported ? (
          <div className="flex-1 flex items-center justify-center p-8 text-center">
            <div>
              <p className="text-lg font-medium text-text mb-3">Not Available Yet</p>
              <p className="text-textSecondary mb-2">
                We're not currently supported in your location
              </p>
              <p className="text-sm text-textSecondary">
                Coming soon! Select a city from the dropdown above to explore other locations.
              </p>
            </div>
          </div>
        ) : !selectedLocation && !isNearbyMode ? (
          <div className="flex-1 flex items-center justify-center p-8 text-center">
            <div>
              <p className="text-2xl font-bold text-text mb-4">Welcome to Filter</p>
              <p className="text-textSecondary mb-4">
                Discover the best specialty coffee shops around the world
              </p>
              <div className="text-left max-w-sm mx-auto space-y-3 text-sm text-textSecondary">
                <p>🗺️ Explore cities on the map</p>
                <p>📍 Find coffee shops near you</p>
                <p>☕ Get curated recommendations</p>
              </div>
              <p className="text-sm text-textSecondary mt-6">
                Select a city above or click "Nearby" to get started
              </p>
            </div>
          </div>
        ) : (
          <ShopList
            shops={shops}
            selectedShop={selectedShop}
            onShopSelect={onShopSelect}
            isLoading={isLoading}
          />
        )}
      </div>

      {/* Mobile footer - only visible on mobile */}
      <div className="lg:hidden border-t border-border p-4">
        <div className="flex items-center justify-center gap-4 text-xs text-textSecondary">
          <Link href="/privacy" className="hover:text-accent transition-colors">
            Privacy
          </Link>
          <span className="text-border">•</span>
          <Link href="/terms" className="hover:text-accent transition-colors">
            Terms
          </Link>
          <span className="text-border">•</span>
          <span>© {new Date().getFullYear()} Filter</span>
        </div>
      </div>
    </aside>
  );
}
