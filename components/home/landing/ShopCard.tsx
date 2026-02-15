'use client';

import Image from 'next/image';
import { Shop } from '@/lib/types';
import { getMediaUrl, getShopDisplayName } from '@/lib/utils';
import { CircleFlag } from 'react-circle-flags';

interface ShopCardProps {
  shop: Shop;
  onClick: (shop: Shop) => void;
  /** "default" = light bg (text-primary), "inverted" = contrastBlock bg (text-contrastText) */
  variant?: 'default' | 'inverted';
  /** "vertical" = image on top, "horizontal" = image left */
  layout?: 'vertical' | 'horizontal';
  /** Optional rank badge (top-left glass pill, e.g. "01") */
  rank?: number | null;
  /** Optional override description (e.g. critic's pick reason) */
  description?: string | null;
}

export function ShopCard({ shop, onClick, variant = 'default', layout = 'horizontal', rank, description }: ShopCardProps) {
  const imageUrl = getMediaUrl(shop.featured_image);
  const logoUrl = getMediaUrl(shop.brand?.logo);
  const displayName = getShopDisplayName(shop);
  const cityName = shop.location?.name || shop.city_area?.location?.name;
  const countryName = shop.location?.country?.name;
  const countryCode = shop.location?.country?.code?.toLowerCase();

  const isIndependent = shop.brand?.type?.toLowerCase() === 'independent';
  const fallbackDescription = isIndependent ? shop.brand?.statement : shop.description;
  const displayDescription = description ?? fallbackDescription;

  const inv = variant === 'inverted';

  if (layout === 'vertical') {
    return (
      <button
        onClick={() => onClick(shop)}
        className="w-full text-left group"
      >
        {/* Image */}
        <div className={`relative aspect-[3/2] rounded-xl overflow-hidden ${inv ? 'bg-white/5' : 'bg-gray-100 dark:bg-white/5'}`}>
          {imageUrl && (
            <Image
              src={imageUrl}
              alt={displayName}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(min-width: 768px) 33vw, 100vw"
            />
          )}

          {/* Rank badge */}
          {rank != null && (
            <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-black/30 backdrop-blur-sm">
              <span className="text-xs font-semibold text-white/70">
                {String(rank).padStart(2, '0')}
              </span>
            </div>
          )}

          {/* Corner gradient for logo contrast */}
          {logoUrl && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(to top right, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.1) 30%, transparent 60%)',
              }}
            />
          )}

          {/* Brand logo badge */}
          {logoUrl && (
            <div className="absolute bottom-3 left-3 w-12 h-12 rounded-full overflow-hidden bg-white shadow-md border-2 border-white">
              <Image
                src={logoUrl}
                alt={shop.brand?.name || ''}
                width={48}
                height={48}
                className="object-cover w-full h-full"
              />
            </div>
          )}
        </div>

        {/* Text */}
        <div className="mt-2.5">
          <h3 className={`text-sm font-medium line-clamp-1 group-hover:text-accent transition-colors ${inv ? 'text-contrastText' : 'text-primary'}`}>
            {displayName}
          </h3>
          {cityName && (
            <p
              className={`text-xs mt-0.5 flex items-center gap-1.5 ${inv ? 'text-contrastText' : 'text-text-secondary'}`}
              style={inv ? { opacity: 0.4 } : undefined}
            >
              {cityName}{countryName ? `, ${countryName}` : ''}
              {countryCode && <span className="inline-flex w-3 h-3 flex-shrink-0"><CircleFlag countryCode={countryCode} height={12} /></span>}
            </p>
          )}
          {displayDescription && (
            <p
              className={`text-xs mt-1 line-clamp-2 ${inv ? 'text-contrastText' : 'text-text-secondary'}`}
              style={inv ? { opacity: 0.5 } : undefined}
            >
              {displayDescription}
            </p>
          )}
        </div>
      </button>
    );
  }

  // Horizontal layout (default)
  return (
    <button
      onClick={() => onClick(shop)}
      className="w-full text-left group flex gap-4 items-start"
    >
      {/* Image — left */}
      <div className={`relative w-28 h-20 md:w-36 md:h-24 flex-shrink-0 rounded-xl overflow-hidden ${inv ? 'bg-white/5' : 'bg-gray-100 dark:bg-white/5'}`}>
        {imageUrl && (
          <Image
            src={imageUrl}
            alt={displayName}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="144px"
          />
        )}
      </div>

      {/* Text — right */}
      <div className="flex-1 min-w-0 py-1">
        {/* Brand logo + name */}
        <div className="flex items-center gap-2.5 mb-1.5">
          {logoUrl && (
            <div className="w-10 h-10 rounded-full overflow-hidden bg-white dark:bg-white/10 shadow-sm flex-shrink-0">
              <Image
                src={logoUrl}
                alt={shop.brand?.name || ''}
                width={40}
                height={40}
                className="object-cover w-full h-full"
              />
            </div>
          )}
          <h3 className={`text-base md:text-lg font-medium line-clamp-1 group-hover:text-accent transition-colors ${inv ? 'text-contrastText' : 'text-primary'}`}>
            {displayName}
          </h3>
        </div>

        {cityName && (
          <p
            className={`text-xs flex items-center gap-1.5 ${inv ? 'text-contrastText' : 'text-text-secondary'}`}
            style={inv ? { opacity: 0.4 } : undefined}
          >
            {cityName}{countryName ? `, ${countryName}` : ''}
            {countryCode && <span className="inline-flex w-3 h-3 flex-shrink-0"><CircleFlag countryCode={countryCode} height={12} /></span>}
          </p>
        )}
        {displayDescription && (
          <p
            className={`text-xs mt-1 line-clamp-2 ${inv ? 'text-contrastText' : 'text-text-secondary'}`}
            style={inv ? { opacity: 0.5 } : undefined}
          >
            {displayDescription}
          </p>
        )}

        {/* Rank badge */}
        {rank != null && (
          <span className={`inline-block mt-2 text-xs font-mono ${inv ? 'text-contrastText opacity-30' : 'text-text-secondary opacity-40'}`}>
            {String(rank).padStart(2, '0')}
          </span>
        )}
      </div>
    </button>
  );
}
