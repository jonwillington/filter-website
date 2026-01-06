'use client';

import { Shop, OpeningHours } from '@/lib/types';
import { Avatar, Chip } from '@heroui/react';
import { StatusChip } from '@/components/ui';
import { getMediaUrl, getShopDisplayName } from '@/lib/utils';

interface ShopHeaderProps {
  shop: Shop;
}

function isOpeningHoursObject(hours: unknown): hours is OpeningHours {
  return typeof hours === 'object' && hours !== null && !Array.isArray(hours);
}

export function ShopHeader({ shop }: ShopHeaderProps) {
  const logoUrl = getMediaUrl(shop.brand?.logo);
  const heroUrl = getMediaUrl(shop.featured_image);
  const displayName = getShopDisplayName(shop);

  const openingHours = isOpeningHoursObject(shop.opening_hours) ? shop.opening_hours : null;
  const isOpen = shop.is_open ?? openingHours?.open_now;

  const areaName = shop.city_area?.name ?? shop.cityArea?.name;
  const cityName = shop.location?.name;
  const locationText = [areaName, cityName].filter(Boolean).join(', ');

  return (
    <div>
      {/* Hero Image with centered content */}
      <div className="relative">
        <div className="aspect-[4/3] overflow-hidden bg-surface">
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

        {/* Centered content on hero */}
        <div className="absolute inset-x-0 bottom-0 pb-5 px-5 flex flex-col items-center text-center">
          {/* Brand logo */}
          {logoUrl && (
            <Avatar
              src={logoUrl}
              name={shop.brand?.name ?? shop.name}
              size="lg"
              className="w-16 h-16 ring-3 ring-white shadow-lg mb-3"
              showFallback
              fallback={<span />}
            />
          )}

          {/* Shop name */}
          <h1 className="text-xl font-bold text-white leading-tight">
            {displayName}
          </h1>

          {/* Location */}
          {locationText && (
            <p className="text-sm text-white/70 mt-1">
              {locationText}
            </p>
          )}

          {/* Status chips */}
          <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
            {isOpen !== undefined && (
              <StatusChip status={isOpen ? 'success' : 'danger'}>
                {isOpen ? 'Open' : 'Closed'}
              </StatusChip>
            )}

            {(shop.independent || shop.is_chain === false) && (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
