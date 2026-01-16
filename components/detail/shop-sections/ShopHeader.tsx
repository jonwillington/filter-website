'use client';

import { Shop } from '@/lib/types';
import { Avatar, Chip } from '@heroui/react';
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

  return (
    <div>
      {/* Hero Image with centered content */}
      <div className="relative">
        <div className="h-[240px] overflow-hidden bg-surface">
          {heroUrl ? (
            <img
              src={heroUrl}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full" />
          )}
        </div>
        {/* Gradient overlay - stronger for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Left-aligned content on hero */}
        <div className="absolute inset-x-0 bottom-0 pb-4 px-5 flex flex-col items-start">
          {/* Brand logo */}
          {logoUrl && (
            <Avatar
              src={logoUrl}
              name={shop.brand?.name ?? shop.name}
              size="lg"
              className="w-14 h-14 ring-2 ring-white/80 shadow-lg mb-3"
              showFallback
              fallback={<span />}
            />
          )}

          {/* Shop name */}
          <h1 className="text-2xl font-bold text-white leading-tight">
            {displayName}
          </h1>

          {/* Location row with status indicator on the right */}
          <div className="flex items-center justify-between w-full mt-1">
            {locationText && (
              <p className="text-sm text-white/80">
                {locationText}
              </p>
            )}

            {/* Status dot and text */}
            {shop.opening_hours && (
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${statusDotColor}`} />
                <span className="text-sm text-white/80">
                  {openingStatus.statusText}
                </span>
              </div>
            )}
          </div>

          {/* Independent chip */}
          {(shop.independent || shop.is_chain === false) && (
            <div className="flex items-center gap-2 mt-3">
              <Chip
                size="sm"
                variant="flat"
                classNames={{
                  base: 'bg-white/20 backdrop-blur-sm border-0',
                  content: 'text-white text-xs font-medium',
                }}
              >
                Independent
              </Chip>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
