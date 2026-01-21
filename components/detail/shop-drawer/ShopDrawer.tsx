'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import { Shop } from '@/lib/types';
import {
  ShopHeader,
  ShopInfo,
  AboutSection,
  AmenityList,
  BrewMethods,
  BeansSection,
  BrandInfoSection,
  BranchAboutSection,
  ShopProperties,
  UserPhotosSection,
  ShopReviewsSection,
} from '../shop-sections';
import { ActionBar, BrandShopCard } from '../shared';
import { BrandShopsModal } from '@/components/modals/BrandShopsModal';
import { UserPhotoModal } from '@/components/modals/UserPhotoModal';
import { Divider } from '@heroui/react';
import { CircularCloseButton, AwardBox, StickyDrawerHeader } from '@/components/ui';
import { ChevronLeft } from 'lucide-react';
import { getShopDisplayName, hasCityAreaRecommendation, getMediaUrl } from '@/lib/utils';
import { useStickyHeaderOpacity, useDrawerTransition, useShopUserImages } from '@/lib/hooks';
import { getMoreFromBrand } from '@/lib/utils/shopFiltering';
import { ShopDrawerFooter } from './ShopDrawerFooter';

interface ShopDrawerProps {
  shop: Shop;
  allShops: Shop[];
  onClose: () => void;
  onShopSelect: (shop: Shop) => void;
  onOpenLoginModal?: () => void;
  onBack?: () => void;
  previousShop?: Shop; // The shop we're coming from (for dynamic back button)
  useWrapper?: boolean;
}

export function ShopDrawer({ shop, allShops, onClose, onShopSelect, onOpenLoginModal, onBack, previousShop, useWrapper = true }: ShopDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrollParent, setScrollParent] = useState<HTMLElement | null>(null);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [selectedUserImageIndex, setSelectedUserImageIndex] = useState(-1);

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

  // Fetch user photos for this shop
  const { data: userImages = [], isLoading: userImagesLoading } = useShopUserImages(currentShop.documentId, currentShop.id);

  // Get related shops from the same brand
  const moreFromBrand = useMemo(
    () => getMoreFromBrand(currentShop, allShops),
    [currentShop, allShops]
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
        onBack={onBack}
        backLabel={previousShop ? getShopDisplayName(previousShop) : 'City guide'}
      />

      {/* Floating buttons (visible when sticky header is hidden) */}
      <div
        className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between lg:left-4"
        style={{
          opacity: 1 - stickyHeaderOpacity,
          pointerEvents: stickyHeaderOpacity > 0.5 ? 'none' : 'auto',
          paddingLeft: 'max(0px, env(safe-area-inset-left))',
          paddingRight: 'max(0px, env(safe-area-inset-right))',
        }}
      >
        {/* Back button - shows previous shop name or city guide */}
        {onBack ? (
          <button
            onClick={onBack}
            className="group h-10 rounded-full bg-white/90 dark:bg-surface/90 backdrop-blur-sm hover:bg-white dark:hover:bg-surface shadow-md transition-all duration-200 flex items-center gap-1 px-2 pr-3"
            aria-label={previousShop ? `Back to ${getShopDisplayName(previousShop)}` : 'Back to city guide'}
            title={previousShop ? getShopDisplayName(previousShop) : 'City guide'}
          >
            <ChevronLeft className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium truncate max-w-[100px] text-primary">
              {previousShop ? getShopDisplayName(previousShop) : 'City guide'}
            </span>
          </button>
        ) : (
          <div />
        )}
        <CircularCloseButton onPress={onClose} size="sm" />
      </div>

      {/* Content */}
      <div
        className="transition-opacity duration-200 ease-in-out"
        style={{ opacity: isTransitioning ? 0 : 1 }}
      >
        {/* Header with hero image - no padding */}
        <ShopHeader shop={currentShop} />

        {/* Rest of content with padding - staggered animation */}
        <div key={currentShop.documentId} className="p-5 pb-20 stagger-fade-in">
          {/* City Area Recommendation Award - at top */}
          {isTopChoice && (
            <AwardBox
              title={`Filter recommendation in ${areaName || currentShop.location?.name || 'this area'}`}
            />
          )}

          {/* Action bar */}
          <ActionBar shop={currentShop} />

          {/* About/Description */}
          <AboutSection shop={currentShop} />

          {/* Branch-specific description for branded shops */}
          <BranchAboutSection shop={currentShop} />

          {/* Shop Properties (Architects, Price) */}
          <ShopProperties shop={currentShop} />

          {/* Brew Methods */}
          <BrewMethods shop={currentShop} />

          {/* Coffee Sourcing */}
          <BeansSection shop={currentShop} />

          {/* Amenities */}
          <AmenityList shop={currentShop} />

          {/* Brand Info (Equipment & Awards) */}
          <BrandInfoSection shop={currentShop} />

          {/* User Photos */}
          <UserPhotosSection
            images={userImages}
            onPhotoPress={(_, index) => setSelectedUserImageIndex(index)}
            loading={userImagesLoading}
          />

          {/* Reviews */}
          <ShopReviewsSection shop={currentShop} onOpenLoginModal={onOpenLoginModal} />

          {/* More from Brand */}
          {moreFromBrand.length > 0 && currentShop.brand && (
            <div>
              <Divider className="my-5 opacity-30" />
              <h3 className="text-lg font-semibold text-primary mb-4">
                More from {currentShop.brand.name}
              </h3>

              {/* Brand shop cards */}
              <div className="grid grid-cols-2 gap-3">
                {moreFromBrand.slice(0, 2).map((relatedShop) => (
                  <BrandShopCard
                    key={relatedShop.documentId}
                    shop={relatedShop}
                    onClick={() => onShopSelect(relatedShop)}
                  />
                ))}
              </div>

              {/* View More button */}
              {moreFromBrand.length > 2 && (
                <button
                  onClick={() => setIsBrandModalOpen(true)}
                  className="mt-4 w-full py-2.5 text-sm font-medium text-accent hover:text-accent/80 transition-colors border border-border-default rounded-xl hover:bg-surface"
                >
                  View all {moreFromBrand.length} locations
                </button>
              )}
            </div>
          )}

          {/* Address & Opening Hours */}
          <ShopInfo shop={currentShop} />

          {/* Disclaimer */}
          <p className="mt-8 text-xs text-text-secondary text-center">
            This information is the most up to date we have as of{' '}
            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.
            {' '}Notice something incorrect?{' '}
            <a
              href="mailto:hello@filter.coffee"
              className="text-accent hover:underline"
            >
              Get in touch
            </a>
          </p>
        </div>
      </div>

      {/* Fixed footer with social links and directions */}
      <ShopDrawerFooter shop={currentShop} />
    </>
  );

  const modal = currentShop.brand && (
    <BrandShopsModal
      isOpen={isBrandModalOpen}
      onClose={() => setIsBrandModalOpen(false)}
      brandName={currentShop.brand.name}
      brandLogo={getMediaUrl(currentShop.brand.logo)}
      shops={moreFromBrand}
      onShopSelect={onShopSelect}
    />
  );

  const userPhotoModal = (
    <UserPhotoModal
      isOpen={selectedUserImageIndex >= 0}
      onClose={() => setSelectedUserImageIndex(-1)}
      images={userImages}
      initialIndex={Math.max(0, selectedUserImageIndex)}
    />
  );

  if (useWrapper) {
    return (
      <div ref={drawerRef} className="shop-drawer relative">
        {content}
        {modal}
        {userPhotoModal}
      </div>
    );
  }

  return (
    <div ref={contentRef} className="relative">
      {content}
      {modal}
      {userPhotoModal}
    </div>
  );
}
