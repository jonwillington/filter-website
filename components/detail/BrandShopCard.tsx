'use client';

import { Shop, OpeningHours } from '@/lib/types';
import { Avatar } from '@heroui/react';
import { StatusChip } from '@/components/ui';
import { getMediaUrl, getShopDisplayName } from '@/lib/utils';

interface BrandShopCardProps {
  shop: Shop;
  onClick: () => void;
}

function isOpeningHoursObject(hours: unknown): hours is OpeningHours {
  return typeof hours === 'object' && hours !== null && !Array.isArray(hours);
}

export function BrandShopCard({ shop, onClick }: BrandShopCardProps) {
  const logoUrl = getMediaUrl(shop.brand?.logo);
  const imageUrl = getMediaUrl(shop.featured_image);

  // Use prefName or city area name for display
  const displayName = shop.prefName || shop.city_area?.name || shop.cityArea?.name || shop.location?.name || shop.name;

  const openingHours = isOpeningHoursObject(shop.opening_hours) ? shop.opening_hours : null;
  const isOpen = shop.is_open ?? openingHours?.open_now;

  return (
    <button
      onClick={onClick}
      className="group flex-shrink-0 w-[200px] text-left transition-transform duration-200 hover:scale-[1.02]"
    >
      <div className="bg-surface border border-border-default rounded-2xl overflow-hidden shadow-sm">
        {/* Feature image */}
        <div className="relative w-full h-28">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-border flex items-center justify-center">
              <span className="text-textSecondary text-sm">No Image</span>
            </div>
          )}

          {/* Brand logo overlay */}
          {logoUrl && (
            <div className="absolute bottom-2 left-2">
              <Avatar
                src={logoUrl}
                name={shop.brand?.name ?? shop.name}
                size="sm"
                className="w-8 h-8 ring-2 ring-white shadow-sm"
                radius="md"
                showFallback
                fallback={<span />}
              />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3">
          <p className="text-sm font-medium text-text line-clamp-2 mb-1">
            {displayName}
          </p>

          <p className="text-xs text-textSecondary line-clamp-1 mb-3">
            {shop.address || shop.location?.name || ''}
          </p>

          {/* Status */}
          {isOpen !== undefined && (
            <StatusChip
              status={isOpen ? 'success' : 'danger'}
              size="sm"
            >
              {isOpen ? 'Open' : 'Closed'}
            </StatusChip>
          )}
        </div>
      </div>
    </button>
  );
}
