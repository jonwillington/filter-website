'use client';

import { Shop } from '@/lib/types';
import { Avatar } from '@heroui/react';
import { getMediaUrl, getShopDisplayName } from '@/lib/utils';
import { getOpeningStatus, getStatusDotColor } from '@/lib/utils/openingHoursUtils';
import React from 'react';
import { Globe, Instagram, MapPin } from 'lucide-react';

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
      return `https://www.google.com/maps/dir/?api=1&destination_place_id=${shop.google_place_id}&travelmode=walking`;
    }
    const coords = shop.coordinates;
    if (coords?.lat && coords?.lng) {
      return `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}&travelmode=walking`;
    }
    if (shop.address) {
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(shop.address)}&travelmode=walking`;
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
      <div className="px-5 py-4">
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

        {/* Social links */}
        {hasLinks && (() => {
          const links: React.ReactNode[] = [];
          if (directionsUrl) {
            links.push(
              <a key="directions" href={directionsUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-text-secondary hover:text-primary transition-colors">
                <MapPin className="w-3.5 h-3.5 inline" /> Directions
              </a>
            );
          }
          if (website) {
            links.push(
              <a key="website" href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noopener noreferrer" className="text-sm text-text-secondary hover:text-primary transition-colors">
                <Globe className="w-3.5 h-3.5 inline" /> Website
              </a>
            );
          }
          if (instagram) {
            links.push(
              <a key="instagram" href={getInstagramUrl(instagram)} target="_blank" rel="noopener noreferrer" className="text-sm text-text-secondary hover:text-primary transition-colors">
                <Instagram className="w-3.5 h-3.5 inline" /> {getInstagramHandle(instagram)}
              </a>
            );
          }
          if (facebook) {
            links.push(
              <a key="facebook" href={getFacebookUrl(facebook)} target="_blank" rel="noopener noreferrer" className="text-sm text-text-secondary hover:text-primary transition-colors">
                Facebook
              </a>
            );
          }
          if (tiktok) {
            links.push(
              <a key="tiktok" href={getTikTokUrl(tiktok)} target="_blank" rel="noopener noreferrer" className="text-sm text-text-secondary hover:text-primary transition-colors">
                {getTikTokHandle(tiktok)}
              </a>
            );
          }
          return (
            <div className="flex flex-wrap items-center gap-x-1.5 mt-3">
              {links.map((link, i) => (
                <span key={i} className="flex items-center gap-x-1.5">
                  {i > 0 && <span className="text-text-secondary/30">·</span>}
                  {link}
                </span>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
