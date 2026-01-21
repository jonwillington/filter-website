'use client';

import Image from 'next/image';
import { CriticPick, Shop } from '@/lib/types';
import { getMediaUrl, getShopDisplayName } from '@/lib/utils';

interface CriticPickCardProps {
  pick: CriticPick;
  onClick: () => void;
}

export function CriticPickCard({ pick, onClick }: CriticPickCardProps) {
  const shop = pick.shop;
  if (!shop) return null;

  const imageUrl = getMediaUrl(shop.featured_image);
  const logoUrl = getMediaUrl(shop.brand?.logo);
  const displayName = getShopDisplayName(shop);
  const neighborhoodName = shop.city_area?.name;

  // Get short address as fallback
  const getShortAddress = (address: string) => {
    const parts = address.split(',').map(p => p.trim());
    return parts[0];
  };
  const locationLabel = neighborhoodName || (shop.address ? getShortAddress(shop.address) : null);

  return (
    <button
      onClick={onClick}
      className="w-full text-left transition-all duration-200 py-4 px-5 hover:bg-gray-50 dark:hover:bg-white/5 group"
    >
      <div className="flex gap-4">
        {/* Rank badge */}
        {pick.rank && (
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center text-sm font-semibold">
            {pick.rank}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3">
            {/* Shop info */}
            <div className="flex-1 min-w-0">
              {/* Shop name */}
              <h4 className="font-medium text-primary text-[15px] leading-tight">
                {displayName}
              </h4>

              {/* Location */}
              {locationLabel && (
                <p className="text-sm text-text-secondary mt-0.5">
                  {locationLabel}
                </p>
              )}

              {/* Description - why they picked it */}
              {pick.description && (
                <p className="text-sm text-text-secondary mt-2 leading-relaxed">
                  &ldquo;{pick.description}&rdquo;
                </p>
              )}
            </div>

            {/* Shop image */}
            <div className="relative w-20 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-white/10">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={displayName}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : logoUrl ? (
                <div className="w-full h-full flex items-center justify-center p-2">
                  <Image
                    src={logoUrl}
                    alt={shop.brand?.name || displayName}
                    width={40}
                    height={40}
                    className="object-contain"
                  />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-300 dark:text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
