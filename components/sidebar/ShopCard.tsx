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

  // Extract just the street reference, removing city/postal code/country
  const getShortAddress = (address: string) => {
    const parts = address.split(',').map(p => p.trim());

    // First part is typically the street reference
    let result = parts[0];

    // Look for floor/level info in subsequent parts and append it
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      if (/floor|level|unit|suite|bldg|building/i.test(part)) {
        result += `, ${part}`;
      }
    }

    return result;
  };

  const shortAddress = shop.address ? getShortAddress(shop.address) : null;

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
          size="sm"
          className="flex-shrink-0"
          showFallback
          fallback={<span />}
        />
        {hasCityAreaRecommendation() && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-50 flex items-center justify-center shadow-md ring-2 ring-white">
            <Image
              src="/coffee-award.png"
              alt="Recommended"
              width={18}
              height={18}
              className="w-[18px] h-[18px]"
            />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <h4 className="font-medium text-primary truncate text-sm overflow-hidden">
          {displayName}
        </h4>
        {shortAddress && (
          <p className="text-xs text-gray-400 dark:text-white/40 truncate">
            {shortAddress}
          </p>
        )}
      </div>
    </button>
  );
}
