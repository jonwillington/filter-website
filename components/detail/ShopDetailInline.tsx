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
  OpeningHoursSection,
  ShopProperties,
  UserPhotosSection,
  SourcesSection,
} from './shop-sections';
import { ActionBar, BrandShopCard } from './shared';
import { BrandShopsModal } from '@/components/modals/BrandShopsModal';
import { UserPhotoModal } from '@/components/modals/UserPhotoModal';

import { AwardBox } from '@/components/ui';
import { hasCityAreaRecommendation, getMediaUrl } from '@/lib/utils';
import { useShopUserImages } from '@/lib/hooks';
import { getMoreFromBrand } from '@/lib/utils/shopFiltering';

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
      {/* City Area Recommendation Award - full width above hero */}
      {isTopChoice && (
        <div className="shop-card-animate" style={staggerStyle(0)}>
          <AwardBox
            title={`Filter recommendation in ${areaName || shop.location?.name || 'this area'}`}
          />
        </div>
      )}

      {/* Header with hero image */}
      <div className="shop-card-animate" style={staggerStyle(isTopChoice ? 1 : 0)}>
        <ShopHeader shop={shop} />
      </div>

      {/* Content with padding */}
      <div className="px-5 py-4 space-y-10">

        {/* Action bar */}
        <div className="shop-card-animate" style={staggerStyle(isTopChoice ? 2 : 1)}>
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

        {/* Brew Methods & Amenities */}
        <div className="shop-card-animate" style={staggerStyle(isTopChoice ? 6 : 5)}>
          <BrewMethods shop={shop} />
          <AmenityList shop={shop} />
        </div>

        {/* Coffee Sourcing */}
        <div className="shop-card-animate" style={staggerStyle(isTopChoice ? 7 : 6)}>
          <BeansSection shop={shop} onShopSelect={onShopSelect} />
        </div>

        {/* Brand Info (Equipment & Awards) */}
        <div className="shop-card-animate" style={staggerStyle(isTopChoice ? 8 : 7)}>
          <BrandInfoSection shop={shop} />
        </div>

        {/* User Photos */}
        <div className="shop-card-animate" style={staggerStyle(isTopChoice ? 9 : 8)}>
          <UserPhotosSection
            images={userImages}
            onPhotoPress={(_, index) => setSelectedUserImageIndex(index)}
            loading={userImagesLoading}
          />
        </div>

        {/* More from Brand */}
        {moreFromBrand.length > 0 && shop.brand && (
          <div className="shop-card-animate" style={staggerStyle(isTopChoice ? 11 : 10)}>
            <div className="flex items-baseline justify-between mb-4">
              <h3 className="text-lg font-medium text-primary">
                More from {shop.brand.name}
              </h3>
              {moreFromBrand.length > 2 && (
                <button
                  onClick={() => setIsBrandModalOpen(true)}
                  className="text-xs text-white bg-contrastBlock hover:opacity-90 transition-opacity px-3 py-1.5 rounded-full"
                >
                  View all
                </button>
              )}
            </div>

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
          </div>
        )}

        {/* Opening Hours */}
        <div className="shop-card-animate" style={staggerStyle(isTopChoice ? 12 : 11)}>
          <OpeningHoursSection shop={shop} />
        </div>

        {/* Address & Google Rating */}
        <div className="shop-card-animate" style={staggerStyle(isTopChoice ? 13 : 12)}>
          <ShopInfo shop={shop} />
        </div>

        {/* Sources */}
        <div className="shop-card-animate" style={staggerStyle(isTopChoice ? 14 : 13)}>
          <SourcesSection shop={shop} />
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-text-secondary text-center shop-card-animate" style={staggerStyle(isTopChoice ? 15 : 14)}>
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
