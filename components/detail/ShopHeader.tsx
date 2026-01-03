'use client';

import { Shop, OpeningHours } from '@/lib/types';
import { Avatar, Chip } from '@heroui/react';
import { StatusChip } from '@/components/ui';
import { getMediaUrl, getShopDisplayName, countBrewMethods } from '@/lib/utils';
import { Coffee } from 'lucide-react';

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
  const brewMethodCount = countBrewMethods(shop);

  const openingHours = isOpeningHoursObject(shop.opening_hours) ? shop.opening_hours : null;
  const isOpen = shop.is_open ?? openingHours?.open_now;

  const areaName = shop.city_area?.name ?? shop.cityArea?.name;
  const cityName = shop.location?.name;
  const locationText = [areaName, cityName].filter(Boolean).join(', ');

  return (
    <div className="space-y-4">
      {/* Hero Image - always render container, show placeholder if no image */}
      <div className="relative">
        <div className="aspect-[16/9] overflow-hidden bg-surface">
          {heroUrl ? (
            <img
              src={heroUrl}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-6xl opacity-20">☕</span>
            </div>
          )}
        </div>
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Brand logo positioned on hero */}
        {logoUrl && (
          <div className="absolute bottom-4 left-4">
            <Avatar
              src={logoUrl}
              name={shop.brand?.name ?? shop.name}
              size="lg"
              className="w-16 h-16 ring-3 ring-white shadow-lg"
              showFallback
              fallback={<span className="text-2xl">☕</span>}
            />
          </div>
        )}
      </div>

      {/* Shop Info */}
      <div className="pt-2 px-5">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-contrastBlock leading-tight">
            {displayName}
          </h1>

          {locationText && (
            <p className="text-sm text-textSecondary mt-1">
              {locationText}
            </p>
          )}

          {/* Status chips */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {isOpen !== undefined && (
              <StatusChip status={isOpen ? 'success' : 'danger'}>
                {isOpen ? 'Open' : 'Closed'}
              </StatusChip>
            )}

            {brewMethodCount > 0 && (
              <Chip
                size="sm"
                variant="flat"
                startContent={<Coffee className="w-3 h-3" />}
                classNames={{
                  base: 'bg-surface',
                  content: 'text-text text-xs',
                }}
              >
                {brewMethodCount} brew {brewMethodCount === 1 ? 'method' : 'methods'}
              </Chip>
            )}

            {(shop.independent || shop.is_chain === false) && (
              <Chip
                size="sm"
                variant="flat"
                classNames={{
                  base: 'bg-surface border border-border',
                  content: 'text-text text-xs font-medium',
                }}
              >
                Independent
              </Chip>
            )}

            {shop.brand?.type && (
              <Chip
                size="sm"
                variant="flat"
                classNames={{
                  base: 'bg-surface',
                  content: 'text-textSecondary text-xs',
                }}
              >
                {shop.brand.type}
              </Chip>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
