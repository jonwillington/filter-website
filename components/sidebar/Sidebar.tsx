'use client';

import { LocationSelector } from './LocationSelector';
import { ShopList } from './ShopList';
import { WelcomeStats } from './WelcomeStats';
import { AnimatedGradientHeader } from './AnimatedGradientHeader';
import { Location, Shop } from '@/lib/types';
import { cn } from '@/lib/utils';
import { SegmentedControl } from '../ui/SegmentedControl';
import { useMemo, ReactNode, useState } from 'react';
import { Button } from '@heroui/react';
import { Map } from 'lucide-react';
import { LegalModal } from '../modals/LegalModal';

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
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null);

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
      <AnimatedGradientHeader>
        <div className="sidebar-header-content">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">Filter</h1>
            {authComponent && <div className="auth-in-sidebar">{authComponent}</div>}
          </div>
        </div>
      </AnimatedGradientHeader>

      {/* Controls section - outside gradient header */}
      <div className="px-4 py-5 space-y-4 border-b border-border bg-white">
        <LocationSelector
          locations={locations}
          selectedLocation={selectedLocation}
          onLocationChange={onLocationChange}
          isNearbyMode={isNearbyMode}
          onNearbyToggle={onNearbyToggle}
        />
        {shouldShowSegments && (
          <SegmentedControl
            segments={[
              { key: 'topPicks', label: `Top Picks (${topPicksCount})` },
              { key: 'all', label: `All (${allCount})` },
            ]}
            activeSegment={showTopRecommendations ? 'topPicks' : 'all'}
            onSegmentChange={(key) => onTopRecommendationsChange(key === 'topPicks')}
          />
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
          <WelcomeStats
            locations={locations}
            shops={allShops || shops}
            onShopSelect={onShopSelect}
          />
        ) : (
          <>
            {selectedLocation && allCount < 5 && (
              <div className="mx-4 mt-4 mb-2 p-4 bg-warning/10 border border-warning/30 rounded-lg">
                <p className="text-sm text-text leading-snug mb-2">
                  We have been and investigated but <strong>{selectedLocation.name}</strong> is not a great city for coffee.
                </p>
                <p className="text-xs text-textSecondary">
                  Believe we've missed somewhere?{' '}
                  <a href="mailto:hello@filter.coffee" className="text-accent hover:underline font-medium">
                    Get in touch
                  </a>
                </p>
              </div>
            )}
            <ShopList
              shops={shops}
              selectedShop={selectedShop}
              onShopSelect={onShopSelect}
              isLoading={isLoading}
              showTopRecommendations={showTopRecommendations}
              locationName={selectedLocation?.name}
            />
          </>
        )}
      </div>

      {/* Mobile footer - only visible on mobile */}
      <div className="lg:hidden border-t border-border p-4">
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
