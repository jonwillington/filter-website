'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { Shop } from '@/lib/types';
import { ShopHeader } from './ShopHeader';
import { ActionBar } from './ActionBar';
import { ShopInfo } from './ShopInfo';
import { AboutSection } from './AboutSection';
import { AmenityList } from './AmenityList';
import { BrewMethods } from './BrewMethods';
import { BeansSection } from './BeansSection';
import { PhotoGallery } from './PhotoGallery';
import { ShopMiniCard } from './ShopMiniCard';
import { ShopReviewsSection } from './ShopReviewsSection';
import { Button, Accordion, AccordionItem, Divider } from '@heroui/react';
import { X } from 'lucide-react';

interface ShopDrawerProps {
  shop: Shop;
  allShops: Shop[];
  onClose: () => void;
  onShopSelect: (shop: Shop) => void;
}

export function ShopDrawer({ shop, allShops, onClose, onShopSelect }: ShopDrawerProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentShop, setCurrentShop] = useState(shop);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Handle shop transitions
  useEffect(() => {
    if (shop.documentId !== currentShop.documentId) {
      // Fade out
      setIsTransitioning(true);

      // Wait for fade out, then update shop and fade in
      const timeout = setTimeout(() => {
        setCurrentShop(shop);
        setIsTransitioning(false);

        // Scroll to top of drawer
        if (drawerRef.current) {
          drawerRef.current.scrollTop = 0;
        }
      }, 150);

      return () => clearTimeout(timeout);
    }
  }, [shop, currentShop.documentId]);

  // Get more shops from the same brand
  const moreFromBrand = useMemo(() => {
    if (!currentShop.brand?.documentId) return [];
    return allShops.filter(
      (s) =>
        s.documentId !== currentShop.documentId &&
        s.brand?.documentId === currentShop.brand?.documentId &&
        s.location?.documentId === currentShop.location?.documentId
    );
  }, [currentShop, allShops]);

  // Get nearby shops from the same area
  const nearbyShops = useMemo(() => {
    const areaId = currentShop.city_area?.documentId ?? currentShop.cityArea?.documentId;
    if (!areaId) return [];
    return allShops.filter(
      (s) =>
        s.documentId !== currentShop.documentId &&
        (s.city_area?.documentId === areaId || s.cityArea?.documentId === areaId) &&
        // Exclude shops already shown in "more from brand"
        !moreFromBrand.some((b) => b.documentId === s.documentId)
    );
  }, [currentShop, allShops, moreFromBrand]);

  const areaName = currentShop.city_area?.name ?? currentShop.cityArea?.name;

  return (
    <div ref={drawerRef} className="shop-drawer">
      {/* Sticky header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 p-4 border-b border-border flex justify-between items-center">
        <h2 className="text-lg font-semibold text-contrastBlock">Details</h2>
        <Button
          isIconOnly
          variant="light"
          size="sm"
          onPress={onClose}
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Content */}
      <div
        className="p-5 space-y-6 transition-opacity duration-150"
        style={{ opacity: isTransitioning ? 0 : 1 }}
      >
        {/* Header with hero image */}
        <ShopHeader shop={currentShop} />

        {/* Action bar */}
        <ActionBar shop={currentShop} />

        <Divider className="my-4" />

        {/* Basic info (address, hours, rating) */}
        <ShopInfo shop={currentShop} />

        {/* About/Description */}
        <AboutSection shop={currentShop} />

        <Divider className="my-4" />

        {/* Amenities */}
        <AmenityList shop={currentShop} />

        {/* Brew Methods */}
        <BrewMethods shop={currentShop} />

        {/* Coffee Sourcing */}
        <BeansSection shop={currentShop} />

        <Divider className="my-4" />

        {/* Photo Gallery */}
        <PhotoGallery shop={currentShop} />

        <Divider className="my-4" />

        {/* Reviews */}
        <ShopReviewsSection shop={currentShop} />

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
      </div>
    </div>
  );
}
