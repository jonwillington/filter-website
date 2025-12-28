'use client';

import { useMemo } from 'react';
import { Shop } from '@/lib/types';
import { ShopHeader } from './ShopHeader';
import { ActionBar } from './ActionBar';
import { ShopInfo } from './ShopInfo';
import { AboutSection } from './AboutSection';
import { AmenityList } from './AmenityList';
import { BrewMethods } from './BrewMethods';
import { BeansSection } from './BeansSection';
import { PhotoGallery } from './PhotoGallery';
import { RelatedShops } from './RelatedShops';
import { Button } from '@heroui/react';
import { X } from 'lucide-react';

interface ShopDrawerProps {
  shop: Shop;
  allShops: Shop[];
  onClose: () => void;
  onShopSelect: (shop: Shop) => void;
}

export function ShopDrawer({ shop, allShops, onClose, onShopSelect }: ShopDrawerProps) {
  // Get more shops from the same brand
  const moreFromBrand = useMemo(() => {
    if (!shop.brand?.documentId) return [];
    return allShops.filter(
      (s) =>
        s.documentId !== shop.documentId &&
        s.brand?.documentId === shop.brand?.documentId &&
        s.location?.documentId === shop.location?.documentId
    );
  }, [shop, allShops]);

  // Get nearby shops from the same area
  const nearbyShops = useMemo(() => {
    const areaId = shop.city_area?.documentId ?? shop.cityArea?.documentId;
    if (!areaId) return [];
    return allShops.filter(
      (s) =>
        s.documentId !== shop.documentId &&
        (s.city_area?.documentId === areaId || s.cityArea?.documentId === areaId) &&
        // Exclude shops already shown in "more from brand"
        !moreFromBrand.some((b) => b.documentId === s.documentId)
    );
  }, [shop, allShops, moreFromBrand]);

  const areaName = shop.city_area?.name ?? shop.cityArea?.name;

  return (
    <div className="shop-drawer">
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
      <div className="p-5 space-y-6">
        {/* Header with hero image */}
        <ShopHeader shop={shop} />

        {/* Action bar */}
        <ActionBar shop={shop} />

        {/* Basic info (address, hours, rating) */}
        <ShopInfo shop={shop} />

        {/* About/Description */}
        <AboutSection shop={shop} />

        {/* Amenities */}
        <AmenityList shop={shop} />

        {/* Brew Methods */}
        <BrewMethods shop={shop} />

        {/* Coffee Sourcing */}
        <BeansSection shop={shop} />

        {/* Photo Gallery */}
        <PhotoGallery shop={shop} />

        {/* More from Brand */}
        {moreFromBrand.length > 0 && (
          <RelatedShops
            title={`More from ${shop.brand?.name || 'this brand'}`}
            shops={moreFromBrand}
            onShopSelect={onShopSelect}
          />
        )}

        {/* Nearby Shops */}
        {nearbyShops.length > 0 && (
          <RelatedShops
            title={areaName ? `More in ${areaName}` : 'Nearby'}
            shops={nearbyShops}
            onShopSelect={onShopSelect}
          />
        )}
      </div>
    </div>
  );
}
