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
  /** Card variant: 'compact' for mobile sidebar, 'large' for desktop left panel */
  variant?: 'compact' | 'large';
  /** Whether this is the last item in the list (removes bottom border) */
  isLast?: boolean;
  /** Animation index for stagger effect (0 = no animation) */
  animationIndex?: number;
}

function ShopCardComponent({ shop, isSelected, onClick, disabled = false, matchedFilters, variant = 'compact', isLast = false, animationIndex = 0 }: ShopCardProps) {
  const logoUrl = getMediaUrl(shop.brand?.logo);
  const displayName = getShopDisplayName(shop);

  // Get featured image URL for large variant
  const featuredImageUrl = useMemo(() => {
    if (variant !== 'large') return null;
    // Try shop's featured image first, then fall back to brand logo
    const shopImage = (shop as any).featured_image || (shop as any).featuredImage || (shop as any).image;
    if (shopImage) {
      return getMediaUrl(shopImage);
    }
    return null;
  }, [shop, variant]);

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

  // Get area name for the badge
  const areaName = shop.city_area?.name ?? (shop as any).cityArea?.name;

  // Get description - brand story for independents, shop description for chains
  const description = useMemo(() => {
    if (variant !== 'large') return null;
    const isIndependent = shop.independent === true || shop.is_chain === false;
    if (isIndependent) {
      // Use brand story for independents
      return shop.brand?.story || shop.brand?.description || null;
    } else {
      // Use shop description for chains
      const anyShop = shop as any;
      return anyShop.description || anyShop.shop_description || null;
    }
  }, [shop, variant]);

  // Large variant - clean list style with logo on left, shop image on right
  if (variant === 'large') {
    return (
      <button
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        className={cn(
          'w-full text-left transition-colors duration-150 flex items-center gap-4 py-3 px-2 min-h-[136px] group !bg-transparent hover:!bg-transparent active:!bg-transparent',
          !isLast && 'border-b border-gray-100 dark:border-white/5',
          disabled && 'pointer-events-none opacity-50',
          animationIndex > 0 && 'shop-card-animate'
        )}
        style={animationIndex > 0 ? { animationDelay: `${(animationIndex - 1) * 40}ms` } : undefined}
      >
        {/* Left side - Brand logo (smaller) */}
        <div className="relative flex-shrink-0">
          <Avatar
            src={logoUrl || undefined}
            name={shop.brand?.name ?? shop.name}
            size="md"
            className="w-12 h-12"
            showFallback
            fallback={<span className="text-base">{displayName.charAt(0)}</span>}
          />
          {hasCityAreaRecommendation() && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-50 flex items-center justify-center shadow-md ring-2 ring-white dark:ring-surface">
              <Image
                src="/coffee-award.png"
                alt="Top choice"
                width={18}
                height={18}
                className="w-4 h-4"
              />
            </div>
          )}
        </div>

        {/* Middle - Text content */}
        <div className="flex-1 min-w-0">
          {/* Shop name */}
          <h4 className="font-medium text-primary text-[20px] leading-snug mb-0.5 line-clamp-1 group-hover:text-amber-900 dark:group-hover:text-amber-700 transition-colors">
            {displayName}
          </h4>

          {/* Description - brand story for independents, shop description for chains */}
          {description && (
            <p className="text-[13px] text-text-secondary line-clamp-2">
              {description}
            </p>
          )}

          {/* Matched filters */}
          {resolvedFilters.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {resolvedFilters.slice(0, 3).map((filter, i) => (
                <span
                  key={i}
                  className="text-xs px-2.5 py-1 rounded-md bg-stone-200 dark:bg-stone-700/50 text-stone-600 dark:text-stone-300"
                >
                  {filter}
                </span>
              ))}
              {resolvedFilters.length > 3 && (
                <span className="text-xs px-2 py-1 text-text-secondary">
                  +{resolvedFilters.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right side - Shop featured image */}
        {featuredImageUrl && (
          <div className="flex-shrink-0 w-32 h-20 rounded-lg overflow-hidden bg-surface">
            <Image
              src={featuredImageUrl}
              alt={displayName}
              width={128}
              height={80}
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </button>
    );
  }

  // Compact variant (default) - original layout
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
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {resolvedFilters.map((filter, i) => (
              <span
                key={i}
                className="text-xs px-2 py-0.5 rounded-md bg-stone-200 dark:bg-stone-700/50 text-stone-600 dark:text-stone-300"
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
    prevProps.variant === nextProps.variant &&
    prevProps.isLast === nextProps.isLast &&
    prevProps.animationIndex === nextProps.animationIndex &&
    prevProps.matchedFilters?.join(',') === nextProps.matchedFilters?.join(',')
  );
});
