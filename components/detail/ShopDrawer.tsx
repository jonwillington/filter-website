'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import { Shop } from '@/lib/types';
import { ShopHeader } from './ShopHeader';
import { ActionBar } from './ActionBar';
import { ShopInfo } from './ShopInfo';
import { AboutSection } from './AboutSection';
import { AmenityList } from './AmenityList';
import { BrewMethods } from './BrewMethods';
import { BeansSection } from './BeansSection';
import { BrandInfoSection } from './BrandInfoSection';
import { PhotoGallery } from './PhotoGallery';
import { ShopMiniCard } from './ShopMiniCard';
import { ShopReviewsSection } from './ShopReviewsSection';
import { Accordion, AccordionItem, Divider } from '@heroui/react';
import { CircularCloseButton, AwardBox, StickyDrawerHeader } from '@/components/ui';
import { getShopDisplayName, hasCityAreaRecommendation } from '@/lib/utils';
import { useStickyHeaderOpacity, useDrawerTransition } from '@/lib/hooks';
import { getMoreFromBrand, getNearbyShops } from '@/lib/utils/shopFiltering';

interface ShopDrawerProps {
  shop: Shop;
  allShops: Shop[];
  onClose: () => void;
  onShopSelect: (shop: Shop) => void;
  onOpenLoginModal?: () => void;
  useWrapper?: boolean;
}

export function ShopDrawer({ shop, allShops, onClose, onShopSelect, onOpenLoginModal, useWrapper = true }: ShopDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrollParent, setScrollParent] = useState<HTMLElement | null>(null);

  // Find scrollable parent when not using wrapper
  useEffect(() => {
    if (!useWrapper && contentRef.current) {
      // Find nearest scrollable ancestor (the .shop-drawer from UnifiedDrawer)
      let parent = contentRef.current.parentElement;
      while (parent) {
        const style = getComputedStyle(parent);
        if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
          setScrollParent(parent);
          break;
        }
        parent = parent.parentElement;
      }
    }
  }, [useWrapper]);

  // Create a ref object that points to the scroll container
  const scrollRef = useRef<HTMLDivElement>(null);

  // Update scrollRef to point to the correct scroll container
  useEffect(() => {
    if (useWrapper) {
      (scrollRef as any).current = drawerRef.current;
    } else if (scrollParent) {
      (scrollRef as any).current = scrollParent;
    }
  }, [useWrapper, scrollParent]);

  // Use extracted hooks for cleaner code and better HMR
  const { opacity: stickyHeaderOpacity, resetOpacity } = useStickyHeaderOpacity(scrollRef);
  const { displayedItem: currentShop, isTransitioning } = useDrawerTransition({
    item: shop,
    getKey: (s) => s.documentId,
    scrollRef,
  });

  // Get related shops using extracted utility functions
  const moreFromBrand = useMemo(
    () => getMoreFromBrand(currentShop, allShops),
    [currentShop, allShops]
  );

  const nearbyShops = useMemo(
    () => getNearbyShops(currentShop, allShops, moreFromBrand.map(s => s.documentId)),
    [currentShop, allShops, moreFromBrand]
  );

  const areaName = currentShop.city_area?.name ?? currentShop.cityArea?.name;
  const isTopChoice = hasCityAreaRecommendation(currentShop);

  const displayName = getShopDisplayName(currentShop);

  const content = (
    <>
      {/* Sticky header that fades in on scroll */}
      <StickyDrawerHeader
        title={displayName}
        opacity={stickyHeaderOpacity}
        onClose={onClose}
      />

      {/* Floating close button (visible when sticky header is hidden) */}
      <CircularCloseButton
        onPress={onClose}
        className="absolute top-3 right-3 z-20"
        style={{
          opacity: 1 - stickyHeaderOpacity,
          pointerEvents: stickyHeaderOpacity > 0.5 ? 'none' : 'auto',
        }}
      />

      {/* Content */}
      <div
        className="transition-opacity duration-200 ease-in-out"
        style={{ opacity: isTransitioning ? 0 : 1 }}
      >
        {/* Header with hero image - no padding */}
        <ShopHeader shop={currentShop} />

        {/* Rest of content with padding */}
        <div className="p-5 space-y-6">
          {/* City Area Recommendation Award - at top */}
          {isTopChoice && (
            <AwardBox
              title={`Top Choice in ${areaName || currentShop.location?.name || 'this area'}`}
            />
          )}

          {/* Action bar */}
          <ActionBar shop={currentShop} />

        {/* About/Description */}
        <AboutSection shop={currentShop} />

        <Divider className="my-4" />

        {/* Amenities */}
        <AmenityList shop={currentShop} />

        {/* Brew Methods */}
        <BrewMethods shop={currentShop} />

        {/* Coffee Sourcing */}
        <BeansSection shop={currentShop} />

        {/* Brand Info (Equipment & Awards) */}
        <BrandInfoSection shop={currentShop} />

        <Divider className="my-4" />

        {/* Photo Gallery */}
        <PhotoGallery shop={currentShop} />

        <Divider className="my-4" />

        {/* Reviews */}
        <ShopReviewsSection shop={currentShop} onOpenLoginModal={onOpenLoginModal} />

        {/* Related Shops Accordion */}
        {(moreFromBrand.length > 0 || nearbyShops.length > 0) && (
          <div>
            <h3 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-3">
              More Shops
            </h3>
            <Accordion variant="splitted">
              {moreFromBrand.length > 0 ? (
                <AccordionItem
                  key="brand"
                  aria-label={`More from ${currentShop.brand?.name || 'this brand'}`}
                  title={`By ${currentShop.brand?.name || 'this brand'} (${moreFromBrand.length})`}
                >
                  <div className="space-y-2 pb-2">
                    {moreFromBrand.slice(0, 5).map((relatedShop) => (
                      <ShopMiniCard
                        key={relatedShop.documentId}
                        shop={relatedShop}
                        onClick={() => onShopSelect(relatedShop)}
                      />
                    ))}
                  </div>
                </AccordionItem>
              ) : null}
              {nearbyShops.length > 0 ? (
                <AccordionItem
                  key="nearby"
                  aria-label={areaName ? `More in ${areaName}` : 'Nearby'}
                  title={`In ${areaName || 'this area'} (${nearbyShops.length})`}
                >
                  <div className="space-y-2 pb-2">
                    {nearbyShops.slice(0, 5).map((relatedShop) => (
                      <ShopMiniCard
                        key={relatedShop.documentId}
                        shop={relatedShop}
                        onClick={() => onShopSelect(relatedShop)}
                      />
                    ))}
                  </div>
                </AccordionItem>
              ) : null}
            </Accordion>
          </div>
        )}

        <Divider className="my-4" />

        {/* Address & Opening Hours */}
        <ShopInfo shop={currentShop} />
        </div>
      </div>
    </>
  );

  if (useWrapper) {
    return (
      <div ref={drawerRef} className="shop-drawer relative">
        {content}
      </div>
    );
  }

  return (
    <div ref={contentRef} className="relative">
      {content}
    </div>
  );
}
