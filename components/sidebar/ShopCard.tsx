'use client';

import { Shop } from '@/lib/types';
import { Avatar } from '@heroui/react';
import { cn, getMediaUrl, getShopDisplayName } from '@/lib/utils';
import Image from 'next/image';

interface ShopCardProps {
  shop: Shop;
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function ShopCard({ shop, isSelected, onClick, disabled = false }: ShopCardProps) {
  const logoUrl = getMediaUrl(shop.brand?.logo);
  const displayName = getShopDisplayName(shop);

  // Extract street identifier from address (before first comma)
  const getStreetIdentifier = (address: string) => {
    // Split by comma and take first part
    const parts = address.split(',');
    if (parts.length > 0) {
      return parts[0].trim();
    }
    return address;
  };

  const streetAddress = shop.address ? getStreetIdentifier(shop.address) : null;

  // Check if shop has city area recommendation
  const hasCityAreaRecommendation = (): boolean => {
    const anyShop = shop as any;
    if (typeof anyShop.cityAreaRec === 'boolean') {
      return anyShop.cityAreaRec;
    }
    if (typeof anyShop.city_area_rec === 'boolean') {
      return anyShop.city_area_rec;
    }
    if (typeof anyShop.cityarearec === 'boolean') {
      return anyShop.cityarearec;
    }
    return false;
  };

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        'shop-card w-full text-left transition-all duration-200 overflow-hidden',
        isSelected && 'selected',
        disabled && 'pointer-events-none'
      )}
    >
      <div className="relative flex-shrink-0">
        <Avatar
          src={logoUrl || undefined}
          name={shop.brand?.name ?? shop.name}
          size="md"
          className="flex-shrink-0"
          showFallback
          fallback={
            <span className="text-lg">☕</span>
          }
        />
        {hasCityAreaRecommendation() && (
          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm">
            <Image
              src="/coffee-award.png"
              alt="Recommended"
              width={16}
              height={16}
              className="w-4 h-4"
            />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <h4 className="font-medium text-text truncate text-sm overflow-hidden">
          {displayName}
        </h4>
        {streetAddress && (
          <p className="text-xs text-textSecondary line-clamp-2 overflow-hidden">
            {streetAddress}
          </p>
        )}
      </div>
    </button>
  );
}
