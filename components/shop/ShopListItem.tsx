'use client';

import { memo, useMemo, ReactNode } from 'react';
import Image from 'next/image';
import { Avatar } from '@heroui/react';
import { Shop } from '@/lib/types';
import { getMediaUrl, getShopDisplayName } from '@/lib/utils';

interface ShopListItemProps {
  shop: Shop;
  onClick: () => void;
  subtitle?: string;
  caption?: ReactNode;
  badge?: ReactNode;
  showDescription?: boolean;
  showImage?: boolean;
  className?: string;
}

export const ShopListItem = memo(function ShopListItem({
  shop,
  onClick,
  subtitle,
  caption,
  badge,
  showDescription = true,
  showImage = true,
  className,
}: ShopListItemProps) {
  const displayName = getShopDisplayName(shop);
  const logoUrl = getMediaUrl(shop.brand?.logo);
  const featuredImageUrl = getMediaUrl(shop.featured_image);

  const description = useMemo(() => {
    if (!showDescription) return null;
    const isIndependent = shop.brand?.type?.toLowerCase() === 'independent';
    if (isIndependent) {
      return shop.brand?.statement || null;
    }
    return (shop as any).description || (shop as any).shop_description || null;
  }, [shop, showDescription]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left flex items-center gap-3 py-4 px-2 group transition-colors duration-150 ${className ?? ''}`}
    >
      {/* Left - Avatar */}
      <div className="flex-shrink-0">
        <Avatar
          src={logoUrl || undefined}
          name={shop.brand?.name ?? shop.name}
          size="sm"
          className="w-10 h-10"
          showFallback
          fallback={<span className="text-sm">{displayName.charAt(0)}</span>}
        />
      </div>

      {/* Middle - Text content */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-primary text-base leading-snug line-clamp-1 group-hover:text-amber-900 dark:group-hover:text-amber-700 transition-colors flex items-center gap-1.5">
          {badge}
          {displayName}
        </h4>
        {subtitle && (
          <p className="text-xs text-text-secondary line-clamp-1 mt-0.5">
            {subtitle}
          </p>
        )}
        {description && (
          <p className="text-xs text-text-secondary line-clamp-2 mt-0.5">
            {description}
          </p>
        )}
        {caption && (
          <div className="mt-1">
            {caption}
          </div>
        )}
      </div>

      {/* Right - Featured image */}
      {showImage && (
        <div className="flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden bg-border-default">
          {featuredImageUrl ? (
            <Image
              src={featuredImageUrl}
              alt={displayName}
              width={96}
              height={64}
              className="w-full h-full object-cover"
            />
          ) : null}
        </div>
      )}
    </button>
  );
});
