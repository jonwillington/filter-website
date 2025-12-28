'use client';

import { Shop } from '@/lib/types';
import { Avatar } from '@heroui/react';
import { cn, getMediaUrl, getShopDisplayName } from '@/lib/utils';

interface ShopCardProps {
  shop: Shop;
  isSelected: boolean;
  onClick: () => void;
}

export function ShopCard({ shop, isSelected, onClick }: ShopCardProps) {
  const logoUrl = getMediaUrl(shop.brand?.logo);
  const displayName = getShopDisplayName(shop);

  return (
    <button
      onClick={onClick}
      className={cn('shop-card w-full text-left', isSelected && 'selected')}
    >
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
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-text truncate text-sm">
          {displayName}
        </h4>
      </div>
    </button>
  );
}
