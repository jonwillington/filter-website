'use client';

import { Shop } from '@/lib/types';
import { Avatar } from '@heroui/react';
import { getMediaUrl, getShopDisplayName } from '@/lib/utils';
import { getOpeningStatus, getStatusDotColor } from '@/lib/utils/openingHoursUtils';
import { Globe, Instagram, Facebook, Navigation } from 'lucide-react';

// TikTok icon (not in lucide-react)
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

// URL normalization helpers
function getInstagramUrl(handle: string) {
  if (handle.startsWith('http')) return handle;
  const cleanHandle = handle.replace('@', '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '');
  return `https://instagram.com/${cleanHandle}`;
}

function getInstagramHandle(handle: string) {
  if (handle.startsWith('http')) {
    const match = handle.match(/instagram\.com\/([^/?]+)/);
    return match ? `@${match[1]}` : 'Instagram';
  }
  return handle.startsWith('@') ? handle : `@${handle.replace(/^https?:\/\/(www\.)?instagram\.com\//, '')}`;
}

function getFacebookUrl(handle: string) {
  if (handle.startsWith('http')) return handle;
  return `https://facebook.com/${handle}`;
}

function getTikTokUrl(handle: string) {
  if (handle.startsWith('http')) return handle;
  const cleanHandle = handle.replace('@', '');
  return `https://tiktok.com/@${cleanHandle}`;
}

function getTikTokHandle(handle: string) {
  if (handle.startsWith('http')) {
    const match = handle.match(/tiktok\.com\/@?([^/?]+)/);
    return match ? `@${match[1]}` : 'TikTok';
  }
  return handle.startsWith('@') ? handle : `@${handle}`;
}

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

  // Social links - check shop first, then brand
  const website = shop.website || shop.brand?.website;
  const instagram = shop.instagram || shop.brand?.instagram;
  const facebook = shop.facebook || shop.brand?.facebook;
  const tiktok = shop.tiktok || shop.brand?.tiktok;

  // Build Google Maps directions URL
  const getDirectionsUrl = () => {
    if (shop.google_place_id) {
      return `https://www.google.com/maps/dir/?api=1&destination_place_id=${shop.google_place_id}`;
    }
    const coords = shop.coordinates;
    if (coords?.lat && coords?.lng) {
      return `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`;
    }
    if (shop.address) {
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(shop.address)}`;
    }
    return null;
  };
  const directionsUrl = getDirectionsUrl();

  const hasLinks = website || instagram || facebook || tiktok || directionsUrl;

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
      <div className="px-5 py-4 border-b border-black/5 dark:border-white/5">
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
            {/* Name */}
            <h1 className="text-2xl font-medium text-primary leading-tight">
              {displayName}
            </h1>

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

            {/* Opening hours status */}
            {shop.opening_hours && (
              <div className="flex items-center gap-1.5 mt-2">
                <span className={`w-2 h-2 rounded-full ${statusDotColor}`} />
                <span className="text-sm text-text-secondary">
                  {openingStatus.statusText}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Social link chips */}
        {hasLinks && (
          <div className="flex flex-wrap gap-2 mt-3">
            {directionsUrl && (
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-white/10 border border-border-default text-sm text-text-secondary hover:text-primary transition-colors"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Directions</span>
              </a>
            )}
            {website && (
              <a
                href={website.startsWith('http') ? website : `https://${website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-white/10 border border-border-default text-sm text-text-secondary hover:text-primary transition-colors"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Website</span>
              </a>
            )}
            {instagram && (
              <a
                href={getInstagramUrl(instagram)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-white/10 border border-border-default text-sm text-text-secondary hover:text-primary transition-colors"
              >
                <Instagram className="w-3.5 h-3.5" />
                <span>{getInstagramHandle(instagram)}</span>
              </a>
            )}
            {facebook && (
              <a
                href={getFacebookUrl(facebook)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-white/10 border border-border-default text-sm text-text-secondary hover:text-primary transition-colors"
              >
                <Facebook className="w-3.5 h-3.5" />
                <span>Facebook</span>
              </a>
            )}
            {tiktok && (
              <a
                href={getTikTokUrl(tiktok)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-white/10 border border-border-default text-sm text-text-secondary hover:text-primary transition-colors"
              >
                <TikTokIcon className="w-3.5 h-3.5" />
                <span>{getTikTokHandle(tiktok)}</span>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
