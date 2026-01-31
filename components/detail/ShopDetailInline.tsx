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
    <div className="relative">
      {/* Header with hero image */}
      <ShopHeader shop={shop} />

      {/* Content with padding */}
      <div className="p-5 pb-24">
        {/* City Area Recommendation Award */}
        {isTopChoice && (
          <AwardBox
            title={`Filter recommendation in ${areaName || shop.location?.name || 'this area'}`}
          />
        )}

        {/* Action bar */}
        <ActionBar shop={shop} />

        {/* About/Description */}
        <AboutSection shop={shop} />

        {/* Branch-specific description for branded shops */}
        <BranchAboutSection shop={shop} />

        {/* Shop Properties (Architects, Price) */}
        <ShopProperties shop={shop} />

        {/* Brew Methods */}
        <BrewMethods shop={shop} />

        {/* Coffee Sourcing */}
        <BeansSection shop={shop} onShopSelect={onShopSelect} />

        {/* Amenities */}
        <AmenityList shop={shop} />

        {/* Brand Info (Equipment & Awards) */}
        <BrandInfoSection shop={shop} />

        {/* User Photos */}
        <UserPhotosSection
          images={userImages}
          onPhotoPress={(_, index) => setSelectedUserImageIndex(index)}
          loading={userImagesLoading}
        />

        {/* Reviews */}
        <ShopReviewsSection shop={shop} onOpenLoginModal={onOpenLoginModal} />

        {/* More from Brand */}
        {moreFromBrand.length > 0 && shop.brand && (
          <div>
            <Divider className="my-5 opacity-30" />
            <h3 className="text-lg font-semibold text-primary mb-4">
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
        <ShopInfo shop={shop} />

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
