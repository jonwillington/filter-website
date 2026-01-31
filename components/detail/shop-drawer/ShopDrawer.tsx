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

// Trial: hardcoded Instagram embed to preview. Replace with shop.instagram_embed_html from CMS when ready.
const TRIAL_INSTAGRAM_EMBED = `<blockquote class="instagram-media" data-instgrm-captioned data-instgrm-permalink="https://www.instagram.com/p/DId19VfoY7e/?utm_source=ig_embed&amp;utm_campaign=loading" data-instgrm-version="14" style=" background:#FFF; border:0; border-radius:3px; box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15); margin: 1px; max-width:540px; min-width:326px; padding:0; width:99.375%; width:-webkit-calc(100% - 2px); width:calc(100% - 2px);"><div style="padding:16px;"> <a href="https://www.instagram.com/p/DId19VfoY7e/?utm_source=ig_embed&amp;utm_campaign=loading" style=" background:#FFFFFF; line-height:0; padding:0 0; text-align:center; text-decoration:none; width:100%;" target="_blank"> <div style=" display: flex; flex-direction: row; align-items: center;"> <div style="background-color: #F4F4F4; border-radius: 50%; flex-grow: 0; height: 40px; margin-right: 14px; width: 40px;"></div> <div style="display: flex; flex-direction: column; flex-grow: 1; justify-content: center;"> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; margin-bottom: 6px; width: 100px;"></div> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; width: 60px;"></div></div></div><div style="padding: 19% 0;"></div> <div style="display:block; height:50px; margin:0 auto 12px; width:50px;"><svg width="50px" height="50px" viewBox="0 0 60 60" version="1.1" xmlns="https://www.w3.org/2000/svg" xmlns:xlink="https://www.w3.org/1999/xlink"><g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"><g transform="translate(-511.000000, -20.000000)" fill="#000000"><g><path d="M556.869,30.41 C554.814,30.41 553.148,32.076 553.148,34.131 C553.148,36.186 554.814,37.852 556.869,37.852 C558.924,37.852 560.59,36.186 560.59,34.131 C560.59,32.076 558.924,30.41 556.869,30.41 M541,60.657 C535.114,60.657 530.342,55.887 530.342,50 C530.342,44.114 535.114,39.342 541,39.342 C546.887,39.342 551.658,44.114 551.658,50 C551.658,55.887 546.887,60.657 541,60.657 M541,33.886 C532.1,33.886 524.886,41.1 524.886,50 C524.886,58.899 532.1,66.113 541,66.113 C549.9,66.113 557.115,58.899 557.115,50 C557.115,41.1 549.9,33.886 541,33.886 M565.378,62.101 C565.244,65.022 564.756,66.606 564.346,67.663 C563.803,69.06 563.154,70.057 562.106,71.106 C561.058,72.155 560.06,72.803 558.662,73.347 C557.607,73.757 556.021,74.244 553.102,74.378 C549.944,74.521 548.997,74.552 541,74.552 C533.003,74.552 532.056,74.521 528.898,74.378 C525.979,74.244 524.393,73.757 523.338,73.347 C521.94,72.803 520.942,72.155 519.894,71.106 C518.846,70.057 518.197,69.06 517.654,67.663 C517.244,66.606 516.755,65.022 516.623,62.101 C516.479,58.943 516.448,57.996 516.448,50 C516.448,42.003 516.479,41.056 516.623,37.899 C516.755,34.978 517.244,33.391 517.654,32.338 C518.197,30.938 518.846,29.942 519.894,28.894 C520.942,27.846 521.94,27.196 523.338,26.654 C524.393,26.244 525.979,25.756 528.898,25.623 C532.057,25.479 533.004,25.448 541,25.448 C548.997,25.448 549.943,25.479 553.102,25.623 C556.021,25.756 557.607,26.244 558.662,26.654 C560.06,27.196 561.058,27.846 562.106,28.894 C563.154,29.942 563.803,30.938 564.346,32.338 C564.756,33.391 565.244,34.978 565.378,37.899 C565.522,41.056 565.552,42.003 565.552,50 C565.552,57.996 565.522,58.943 565.378,62.101 M570.82,37.631 C570.674,34.438 570.167,32.258 569.425,30.349 C568.659,28.377 567.633,26.702 565.965,25.035 C564.297,23.368 562.623,22.342 560.652,21.575 C558.743,20.834 556.562,20.326 553.369,20.18 C550.169,20.033 549.148,20 541,20 C532.853,20 531.831,20.033 528.631,20.18 C525.438,20.326 523.257,20.834 521.349,21.575 C519.376,22.342 517.703,23.368 516.035,25.035 C514.368,26.702 513.342,28.377 512.574,30.349 C511.834,32.258 511.326,34.438 511.181,37.631 C511.035,40.831 511,41.851 511,50 C511,58.147 511.035,59.17 511.181,62.369 C511.326,65.562 511.834,67.743 512.574,69.651 C513.342,71.625 514.368,73.296 516.035,74.965 C517.703,76.634 519.376,77.658 521.349,78.425 C523.257,79.167 525.438,79.673 528.631,79.82 C531.831,79.965 532.853,80.001 541,80.001 C549.148,80.001 550.169,79.965 553.369,79.82 C556.562,79.673 558.743,79.167 560.652,78.425 C562.623,77.658 564.297,76.634 565.965,74.965 C567.633,73.296 568.659,71.625 569.425,69.651 C570.167,67.743 570.674,65.562 570.82,62.369 C570.966,59.17 571,58.147 571,50 C571,41.851 570.966,40.831 570.82,37.631"></path></g></g></g></svg></div><div style="padding-top: 8px;"> <div style=" color:#3897f0; font-family:Arial,sans-serif; font-size:14px; font-style:normal; font-weight:550; line-height:18px;">View this post on Instagram</div></div><div style="padding: 12.5% 0;"></div> <div style="display: flex; flex-direction: row; margin-bottom: 14px; align-items: center;"><div> <div style="background-color: #F4F4F4; border-radius: 50%; height: 12.5px; width: 12.5px; transform: translateX(0px) translateY(7px);"></div> <div style="background-color: #F4F4F4; height: 12.5px; transform: rotate(-45deg) translateX(3px) translateY(1px); width: 12.5px; flex-grow: 0; margin-right: 14px; margin-left: 2px;"></div> <div style="background-color: #F4F4F4; border-radius: 50%; height: 12.5px; width: 12.5px; transform: translateX(9px) translateY(-18px);"></div></div><div style="margin-left: 8px;"> <div style=" background-color: #F4F4F4; border-radius: 50%; flex-grow: 0; height: 20px; width: 20px;"></div> <div style=" width: 0; height: 0; border-top: 2px solid transparent; border-left: 6px solid #f4f4f4; border-bottom: 2px solid transparent; transform: translateX(16px) translateY(-4px) rotate(30deg)"></div></div><div style="margin-left: auto;"> <div style=" width: 0px; border-top: 8px solid #F4F4F4; border-right: 8px solid transparent; transform: translateY(16px);"></div> <div style=" background-color: #F4F4F4; flex-grow: 0; height: 12px; width: 16px; transform: translateY(-4px);"></div> <div style=" width: 0; height: 0; border-top: 8px solid #F4F4F4; border-left: 8px solid transparent; transform: translateY(-4px) translateX(8px);"></div></div></div> <div style="display: flex; flex-direction: column; flex-grow: 1; justify-content: center; margin-bottom: 24px;"> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; margin-bottom: 6px; width: 224px;"></div> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; width: 144px;"></div></div></a><p style=" color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; line-height:17px; margin-bottom:0; margin-top:8px; overflow:hidden; padding:8px 0 7px; text-align:center; text-overflow:ellipsis; white-space:nowrap;"><a href="https://www.instagram.com/p/DId19VfoY7e/?utm_source=ig_embed&amp;utm_campaign=loading" style=" color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; font-style:normal; font-weight:normal; line-height:17px; text-decoration:none;" target="_blank">A post shared by HEIBAI | Coffee &amp; Tea (@heibai.kafei)</a></p></div></blockquote>`;

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
        <div key={currentShop.documentId} className="p-5 pb-20">
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
          <BeansSection shop={currentShop} onShopSelect={onShopSelect} />

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
              <h3 className="text-lg font-medium text-primary mb-4">
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
