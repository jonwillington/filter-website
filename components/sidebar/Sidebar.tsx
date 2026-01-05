'use client';

import { LocationCell } from './LocationCell';
import { ShopList } from './ShopList';
import { ShortOnShopsAlert } from './ShortOnShopsAlert';
import { AnimatedGradientHeader } from './AnimatedGradientHeader';
import { WelcomeStats } from './WelcomeStats';
import { Location, Shop, Country } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useMemo, ReactNode, useState } from 'react';
import { Button } from '@heroui/react';
import { Map } from 'lucide-react';
import { LegalModal } from '../modals/LegalModal';

export type ShopFilterType = 'all' | 'topPicks' | 'working' | 'interior' | 'brewing';

interface SidebarProps {
  locations: Location[];
  countries?: Country[];
  selectedLocation: Location | null;
  onLocationChange: (location: Location | null) => void;
  shops: Shop[];
  allShops?: Shop[]; // Unfiltered shops for counting
  selectedShop: Shop | null;
  onShopSelect: (shop: Shop) => void;
  isLoading?: boolean;
  isOpen?: boolean;
  shopFilter?: ShopFilterType;
  onShopFilterChange?: (filter: ShopFilterType) => void;
  isAreaUnsupported?: boolean;
  unsupportedCountry?: { name: string; code: string } | null;
  onOpenExploreModal: () => void;
  authComponent?: ReactNode;
  onOpenCityGuide?: () => void;
}

const FILTER_OPTIONS: { key: ShopFilterType; label: string }[] = [
  { key: 'all', label: 'All Shops' },
  { key: 'topPicks', label: 'Top Picks' },
  { key: 'working', label: 'Great for Working' },
  { key: 'interior', label: 'Beautiful Interior' },
  { key: 'brewing', label: 'Excellent Brewing' },
];

export function Sidebar({
  locations,
  countries = [],
  selectedLocation,
  onLocationChange,
  shops,
  allShops,
  selectedShop,
  onShopSelect,
  isLoading,
  isOpen = true,
  shopFilter = 'all',
  onShopFilterChange,
  isAreaUnsupported = false,
  unsupportedCountry,
  onOpenExploreModal,
  authComponent,
  onOpenCityGuide,
}: SidebarProps) {
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null);

  // Count shops for each filter type
  const filterCounts = useMemo(() => {
    const shopsToCount = allShops || shops;
    const counts: Record<ShopFilterType, number> = {
      all: shopsToCount.length,
      topPicks: 0,
      working: 0,
      interior: 0,
      brewing: 0,
    };

    shopsToCount.forEach((shop) => {
      const anyShop = shop as any;
      if (anyShop.cityAreaRec === true || anyShop.city_area_rec === true || anyShop.cityarearec === true) {
        counts.topPicks++;
      }
      if (anyShop.workingRec === true || anyShop.working_rec === true || anyShop.workingrec === true) {
        counts.working++;
      }
      if (anyShop.interiorRec === true || anyShop.interior_rec === true || anyShop.interiorrec === true) {
        counts.interior++;
      }
      if (anyShop.brewingRec === true || anyShop.brewing_rec === true || anyShop.brewingrec === true) {
        counts.brewing++;
      }
    });

    return counts;
  }, [allShops, shops]);

  // Check if there are any special filters available (not just "all")
  const hasSpecialFilters = filterCounts.topPicks > 0 || filterCounts.working > 0 || filterCounts.interior > 0 || filterCounts.brewing > 0;

  // Only show filter when a location is selected, at least 5 shops, and has special filters
  const shouldShowFilter = selectedLocation && onShopFilterChange && filterCounts.all >= 5 && hasSpecialFilters;

  return (
    <aside className={cn('sidebar', isOpen && 'open')}>
      <AnimatedGradientHeader>
        <div className="sidebar-header-content">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">Filter</h1>
            {authComponent && <div className="auth-in-sidebar">{authComponent}</div>}
          </div>
        </div>
      </AnimatedGradientHeader>

      {/* Controls section - outside gradient header */}
      <div className="px-4 py-5 space-y-4 border-b border-border-default bg-background">
        <LocationCell
          selectedLocation={selectedLocation}
          unsupportedCountry={unsupportedCountry ?? null}
          isAreaUnsupported={isAreaUnsupported}
          onClick={onOpenExploreModal}
        />
        {shouldShowFilter && (
          <select
            value={shopFilter}
            onChange={(e) => onShopFilterChange(e.target.value as ShopFilterType)}
            className="w-full h-9 px-3 text-sm text-primary bg-surface border-0 rounded-lg cursor-pointer hover:bg-border-default transition-colors focus:outline-none focus:ring-2 focus:ring-accent/30"
            aria-label="Filter shops"
          >
            {FILTER_OPTIONS.filter(opt => filterCounts[opt.key] > 0 || opt.key === 'all').map((option) => (
              <option key={option.key} value={option.key}>
                {option.label} ({filterCounts[option.key]})
              </option>
            ))}
          </select>
        )}
        {selectedLocation && onOpenCityGuide && (
          <div className="lg:hidden">
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

      <div className="sidebar-content transition-opacity duration-300">
        {isLoading && !selectedLocation && !isAreaUnsupported ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-text-secondary">Finding your location...</p>
            </div>
          </div>
        ) : isAreaUnsupported ? (
          <div className="flex-1 flex items-center justify-center p-8 text-center">
            <div>
              <p className="text-lg font-medium text-primary mb-3">Coming Soon</p>
              <p className="text-text-secondary mb-2">
                We are not currently live in{' '}
                <span className="font-semibold">{unsupportedCountry?.name || 'your area'}</span>{' '}
                but we are coming soon!
              </p>
              <p className="text-sm text-text-secondary">
                Select a city above to explore other locations.
              </p>
            </div>
          </div>
        ) : !selectedLocation ? (
          <WelcomeStats
            locations={locations}
            shops={allShops || shops}
            onShopSelect={onShopSelect}
          />
        ) : (
          <>
            <ShopList
              shops={shops}
              selectedShop={selectedShop}
              onShopSelect={onShopSelect}
              isLoading={isLoading}
            />
            {selectedLocation && filterCounts.all < 5 && (
              <ShortOnShopsAlert locationName={selectedLocation.name} />
            )}
          </>
        )}
      </div>

      {/* Mobile footer - only visible on mobile */}
      <div className="lg:hidden border-t border-border-default p-4">
        <div className="flex items-center justify-center gap-4 text-xs text-textSecondary">
          <button
            onClick={() => setLegalModal('privacy')}
            className="hover:text-accent transition-colors cursor-pointer"
          >
            Privacy
          </button>
          <span className="text-border">•</span>
          <button
            onClick={() => setLegalModal('terms')}
            className="hover:text-accent transition-colors cursor-pointer"
          >
            Terms
          </button>
          <span className="text-border">•</span>
          <span>© {new Date().getFullYear()} Filter</span>
        </div>
      </div>

      <LegalModal
        isOpen={legalModal !== null}
        onClose={() => setLegalModal(null)}
        type={legalModal || 'privacy'}
      />
    </aside>
  );
}
