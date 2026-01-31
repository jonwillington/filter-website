'use client';

import { Shop } from '@/lib/types';
import { Avatar } from '@heroui/react';
import { getMediaUrl, getShopDisplayName } from '@/lib/utils';
import { getOpeningStatus, getStatusDotColor } from '@/lib/utils/openingHoursUtils';

interface ShopHeaderProps {
  shop: Shop;
}

export function ShopHeader({ shop }: ShopHeaderProps) {
  const logoUrl = getMediaUrl(shop.brand?.logo);
  const heroUrl = getMediaUrl(shop.featured_image);
  const displayName = getShopDisplayName(shop);

  const openingStatus = getOpeningStatus(shop.opening_hours);
  const statusDotColor = getStatusDotColor(openingStatus.status);

  const areaName = shop.city_area?.name ?? shop.cityArea?.name;
  const cityName = shop.location?.name;
  const locationText = [areaName, cityName].filter(Boolean).join(', ');

  const isIndependent = shop.independent || shop.is_chain === false;

  return (
    <div>
      {/* Hero Image - clean, no text overlay */}
      <div className="h-[180px] overflow-hidden bg-surface">
        {heroUrl ? (
          <img
            src={heroUrl}
            alt={displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/20 dark:to-amber-800/10" />
        )}
      </div>

      {/* Info section - clean background, matching list typography */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5">
        <div className="flex items-start gap-3">
          {/* Brand logo */}
          <Avatar
            src={logoUrl || undefined}
            name={shop.brand?.name ?? shop.name}
            size="lg"
            className="w-12 h-12 flex-shrink-0"
            showFallback
            fallback={<span className="text-lg">{displayName.charAt(0)}</span>}
          />

          {/* Shop info */}
          <div className="flex-1 min-w-0">
            {/* Name row with status */}
            <div className="flex items-baseline justify-between gap-2">
              <h1 className="text-[1.75rem] font-medium text-primary leading-tight truncate">
                {displayName}
              </h1>

              {/* Status indicator */}
              {shop.opening_hours && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={`w-2 h-2 rounded-full ${statusDotColor}`} />
                  <span className="text-sm text-text-secondary">
                    {openingStatus.statusText}
                  </span>
                </div>
              )}
            </div>

            {/* Location and badges */}
            <div className="flex items-center gap-2 mt-1">
              {locationText && (
                <p className="text-sm text-text-secondary">
                  {locationText}
                </p>
              )}
              {isIndependent && (
                <>
                  {locationText && <span className="text-text-secondary/30">·</span>}
                  <span className="text-sm text-amber-600 dark:text-amber-500 font-medium">
                    Independent
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
