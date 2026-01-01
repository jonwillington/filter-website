'use client';

import { Shop } from '@/lib/types';
import { Avatar } from '@heroui/react';
import { cn, getMediaUrl, getShopDisplayName } from '@/lib/utils';

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

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        'shop-card w-full text-left transition-all duration-200',
        isSelected && 'selected',
        disabled && 'pointer-events-none'
      )}
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
        {streetAddress && (
          <p className="text-xs text-textSecondary line-clamp-2">
            {streetAddress}
          </p>
        )}
      </div>
    </button>
  );
}
