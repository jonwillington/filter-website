'use client';

import { LocationCell } from './LocationCell';
import { ShopList } from './ShopList';
import { ShortOnShopsAlert } from './ShortOnShopsAlert';
import { AnimatedGradientHeader } from './AnimatedGradientHeader';
import { WelcomeStats } from './WelcomeStats';
import { Location, Shop, Country } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useMemo, ReactNode, useState } from 'react';
import { useTags } from '@/lib/hooks/useTags';
import { Button, Select, SelectItem, Switch, Tooltip } from '@heroui/react';
import { Map, SlidersHorizontal, HelpCircle } from 'lucide-react';
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
  applyMyFilters?: boolean;
  onApplyMyFiltersChange?: (value: boolean) => void;
  hasUserFilters?: boolean;
  userPreferences?: {
    preferIndependentOnly?: boolean;
    preferRoastsOwnBeans?: boolean;
    preferredTags?: string[];
    preferredBrewMethods?: string[];
  };
  shopMatchInfo?: Map<string, string[]>;
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
  applyMyFilters = false,
  onApplyMyFiltersChange,
  hasUserFilters = false,
  userPreferences,
  shopMatchInfo,
}: SidebarProps) {
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null);
  const { tags } = useTags();

  // Build user filter summary from preferences
  const userFilterSummary = useMemo(() => {
    if (!userPreferences) return undefined;
    const parts: string[] = [];

    if (userPreferences.preferIndependentOnly) {
      parts.push('Independent only');
    }

    if (userPreferences.preferRoastsOwnBeans) {
      parts.push('Roasts own beans');
    }

    // Format brew methods nicely
    userPreferences.preferredBrewMethods?.forEach((method) => {
      const formatted = method === 'v60' ? 'V60'
        : method === 'aeropress' ? 'AeroPress'
        : method.charAt(0).toUpperCase() + method.slice(1).replace(/_/g, ' ');
      parts.push(formatted);
    });

    // Look up tag labels from tags data
    userPreferences.preferredTags?.forEach((tagId) => {
      const tag = tags.find(t => t.id === tagId);
      if (tag) {
        parts.push(tag.label);
      }
    });

    return parts.length > 0 ? parts.join(', ') : undefined;
  }, [userPreferences, tags]);

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
      <div className="px-4 py-5 space-y-3 border-b border-border-default bg-background">
        <LocationCell
          selectedLocation={selectedLocation}
          unsupportedCountry={unsupportedCountry ?? null}
          isAreaUnsupported={isAreaUnsupported}
          onClick={onOpenExploreModal}
        />
        {/* Apply my filters toggle - only show if user has filters set */}
        {selectedLocation && hasUserFilters && onApplyMyFiltersChange && (
          <div
            className="flex items-center justify-between p-3 rounded-lg"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                Apply my filters
              </span>
              {userFilterSummary && (
                <Tooltip
                  content={userFilterSummary}
                  placement="bottom"
                  delay={200}
                  classNames={{
                    content: 'text-xs px-3 py-2 bg-[#1A1410] text-[#FAF7F5] max-w-[200px]',
                  }}
                >
                  <HelpCircle className="w-3.5 h-3.5 cursor-help" style={{ color: 'var(--text-secondary)' }} />
                </Tooltip>
              )}
            </div>
            <Switch
              isSelected={applyMyFilters}
              onValueChange={onApplyMyFiltersChange}
              size="sm"
              aria-label="Apply my filters"
            />
          </div>
        )}
        {/* Shop filter dropdown - hide when "apply my filters" is on */}
        {shouldShowFilter && !applyMyFilters && (
          <Select
            selectedKeys={[shopFilter]}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0] as ShopFilterType;
              if (selected) onShopFilterChange(selected);
            }}
            aria-label="Filter shops"
            size="sm"
            variant="flat"
            classNames={{
              trigger: 'bg-surface hover:bg-border-default',
              value: 'text-primary',
            }}
            renderValue={(items) => {
              const selected = items[0];
              const option = FILTER_OPTIONS.find(o => o.key === selected?.key);
              const count = option ? filterCounts[option.key as ShopFilterType] : 0;
              return <span style={{ fontFeatureSettings: '"dlig" 0, "calt" 0' }}>{option?.label} ({String(count)})</span>;
            }}
          >
            {FILTER_OPTIONS.filter(opt => filterCounts[opt.key] > 0 || opt.key === 'all').map((option) => (
              <SelectItem key={option.key} textValue={`${option.label} (${filterCounts[option.key]})`}>
                <span style={{ fontFeatureSettings: '"dlig" 0, "calt" 0' }}>{option.label} ({String(filterCounts[option.key])})</span>
              </SelectItem>
            ))}
          </Select>
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
            <div className="flex flex-col items-center">
              {/* Large flag */}
              {unsupportedCountry?.code && (
                <img
                  src={`https://flagcdn.com/w80/${unsupportedCountry.code.toLowerCase()}.png`}
                  alt={`${unsupportedCountry.name} flag`}
                  className="w-16 h-12 object-cover rounded mb-4"
                />
              )}
              <p className="text-xl font-semibold text-primary mb-2">
                Coming Soon to {unsupportedCountry?.name || 'your area'}!
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
            onLocationSelect={onLocationChange}
          />
        ) : (
          <>
            <ShopList
              shops={shops}
              selectedShop={selectedShop}
              onShopSelect={onShopSelect}
              isLoading={isLoading}
              isFiltered={applyMyFilters || shopFilter !== 'all'}
              shopMatchInfo={shopMatchInfo}
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
