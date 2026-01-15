'use client';

import { useMemo, memo } from 'react';
import { Shop } from '@/lib/types';
import { Avatar } from '@heroui/react';
import { cn, getMediaUrl, getShopDisplayName } from '@/lib/utils';
import { useTags } from '@/lib/hooks/useTags';
import Image from 'next/image';

interface ShopCardProps {
  shop: Shop;
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
  matchedFilters?: string[];
}

function ShopCardComponent({ shop, isSelected, onClick, disabled = false, matchedFilters }: ShopCardProps) {
  const logoUrl = getMediaUrl(shop.brand?.logo);
  const displayName = getShopDisplayName(shop);

  // Extract street reference, removing city/postal code/country
  const getShortAddress = (address: string) => {
    const parts = address.split(',').map(p => p.trim());

    // First part is typically the street reference
    let result = parts[0];

    // Include second part if it's useful (not a city/postal/country)
    if (parts.length >= 2) {
      const second = parts[1];
      // Skip if it looks like a postal code, city name only, or country
      const isPostalOrCity = /^\d{4,6}$/.test(second) || // just a postal code
        /^\w+\s+\d{5,6}$/.test(second) || // city + postal (e.g. "Almaty 050000")
        /^[A-Z][a-z]+$/.test(second); // single capitalized word (likely city/country)

      if (!isPostalOrCity) {
        result += `, ${second}`;
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

  // Resolve matched filter labels (convert tag:id to readable labels)
  const { tags } = useTags();
  const resolvedFilters = useMemo(() => {
    if (!matchedFilters || matchedFilters.length === 0) return [];
    return matchedFilters.map(filter => {
      if (filter.startsWith('tag:')) {
        const tagId = filter.slice(4);
        const tag = tags.find(t => t.id === tagId);
        return tag?.label || tagId;
      }
      return filter;
    });
  }, [matchedFilters, tags]);

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
        {resolvedFilters.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {resolvedFilters.map((filter, i) => (
              <span
                key={i}
                className="text-[10px] px-1.5 py-0.5 rounded bg-stone-200 dark:bg-stone-700/50 text-stone-600 dark:text-stone-300"
              >
                {filter}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

// Memoize to prevent unnecessary re-renders when parent state changes
export const ShopCard = memo(ShopCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.shop.documentId === nextProps.shop.documentId &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.matchedFilters?.join(',') === nextProps.matchedFilters?.join(',')
  );
});
