'use client';

import { useMemo, useState } from 'react';
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
} from './shop-sections';
import { ActionBar, BrandShopCard } from './shared';
import { BrandShopsModal } from '@/components/modals/BrandShopsModal';
import { UserPhotoModal } from '@/components/modals/UserPhotoModal';
import { Divider } from '@heroui/react';
import { AwardBox } from '@/components/ui';
import { hasCityAreaRecommendation, getMediaUrl } from '@/lib/utils';
import { useShopUserImages } from '@/lib/hooks';
import { getMoreFromBrand } from '@/lib/utils/shopFiltering';
import { ShopDrawerFooter } from './shop-drawer/ShopDrawerFooter';

interface ShopDetailInlineProps {
  shop: Shop;
  allShops: Shop[];
  onShopSelect: (shop: Shop) => void;
  onOpenLoginModal?: () => void;
}

// Helper to generate animation style with stagger delay
const staggerStyle = (index: number) => ({ animationDelay: `${index * 50}ms` });

/**
 * ShopDetailInline - Shop detail content for inline display in the left panel.
 * This is a simplified version of ShopDrawer without fixed positioning or drawer-specific styles.
 */
export function ShopDetailInline({ shop, allShops, onShopSelect, onOpenLoginModal }: ShopDetailInlineProps) {
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [selectedUserImageIndex, setSelectedUserImageIndex] = useState(-1);

  // Fetch user photos for this shop
  const { data: userImages = [], isLoading: userImagesLoading } = useShopUserImages(shop.documentId, shop.id);

  // Get related shops from the same brand
  const moreFromBrand = useMemo(
    () => getMoreFromBrand(shop, allShops),
    [shop, allShops]
  );

  const areaName = shop.city_area?.name ?? shop.cityArea?.name;
  const isTopChoice = hasCityAreaRecommendation(shop);

  return (
    <div className="relative" key={shop.documentId}>
      {/* Header with hero image - first to animate */}
      <div className="shop-card-animate" style={staggerStyle(0)}>
        <ShopHeader shop={shop} />
      </div>

      {/* Content with padding */}
      <div className="px-5 py-4 pb-24">
        {/* City Area Recommendation Award */}
        {isTopChoice && (
          <div className="mb-4 shop-card-animate" style={staggerStyle(1)}>
            <AwardBox
              title={`Filter recommendation in ${areaName || shop.location?.name || 'this area'}`}
            />
          </div>
        )}

        {/* Action bar */}
        <div className="mb-4 shop-card-animate" style={staggerStyle(isTopChoice ? 2 : 1)}>
          <ActionBar shop={shop} />
        </div>

        {/* About/Description */}
        <div className="shop-card-animate" style={staggerStyle(isTopChoice ? 3 : 2)}>
          <AboutSection shop={shop} />
        </div>

        {/* Branch-specific description for branded shops */}
        <div className="shop-card-animate" style={staggerStyle(isTopChoice ? 4 : 3)}>
          <BranchAboutSection shop={shop} />
        </div>

        {/* Shop Properties (Architects, Price) */}
        <div className="shop-card-animate" style={staggerStyle(isTopChoice ? 5 : 4)}>
          <ShopProperties shop={shop} />
        </div>

        {/* Brew Methods */}
        <div className="shop-card-animate" style={staggerStyle(isTopChoice ? 6 : 5)}>
          <BrewMethods shop={shop} />
        </div>

        {/* Coffee Sourcing */}
        <div className="shop-card-animate" style={staggerStyle(isTopChoice ? 7 : 6)}>
          <BeansSection shop={shop} onShopSelect={onShopSelect} />
        </div>

        {/* Amenities */}
        <div className="shop-card-animate" style={staggerStyle(isTopChoice ? 8 : 7)}>
          <AmenityList shop={shop} />
        </div>

        {/* Brand Info (Equipment & Awards) */}
        <div className="shop-card-animate" style={staggerStyle(isTopChoice ? 9 : 8)}>
          <BrandInfoSection shop={shop} />
        </div>

        {/* User Photos */}
        <div className="shop-card-animate" style={staggerStyle(isTopChoice ? 10 : 9)}>
          <UserPhotosSection
            images={userImages}
            onPhotoPress={(_, index) => setSelectedUserImageIndex(index)}
            loading={userImagesLoading}
          />
        </div>

        {/* Reviews */}
        <div className="shop-card-animate" style={staggerStyle(isTopChoice ? 11 : 10)}>
          <ShopReviewsSection shop={shop} onOpenLoginModal={onOpenLoginModal} />
        </div>

        {/* More from Brand */}
        {moreFromBrand.length > 0 && shop.brand && (
          <div className="shop-card-animate" style={staggerStyle(isTopChoice ? 12 : 11)}>
            <Divider className="my-5 opacity-30" />
            <h3 className="text-lg font-medium text-primary mb-4">
              More from {shop.brand.name}
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
        <div className="shop-card-animate" style={staggerStyle(isTopChoice ? 13 : 12)}>
          <ShopInfo shop={shop} />
        </div>

        {/* Disclaimer */}
        <p className="mt-8 text-xs text-text-secondary text-center shop-card-animate" style={staggerStyle(isTopChoice ? 14 : 13)}>
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

      {/* Fixed footer with social links and directions */}
      <div className="sticky bottom-0 left-0 right-0 bg-background border-t border-border-default">
        <ShopDrawerFooter shop={shop} />
      </div>

      {/* Modals */}
      {shop.brand && (
        <BrandShopsModal
          isOpen={isBrandModalOpen}
          onClose={() => setIsBrandModalOpen(false)}
          brandName={shop.brand.name}
          brandLogo={getMediaUrl(shop.brand.logo)}
          shops={moreFromBrand}
          onShopSelect={onShopSelect}
        />
      )}

      <UserPhotoModal
        isOpen={selectedUserImageIndex >= 0}
        onClose={() => setSelectedUserImageIndex(-1)}
        images={userImages}
        initialIndex={Math.max(0, selectedUserImageIndex)}
      />
    </div>
  );
}
