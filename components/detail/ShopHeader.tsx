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

          {/* Location */}
          {locationText && (
            <p className="text-base text-white/80 mt-1">
              {locationText}
            </p>
          )}

          {/* Status chips */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
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
