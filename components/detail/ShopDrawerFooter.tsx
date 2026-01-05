'use client';

import { Shop } from '@/lib/types';
import { Navigation, Globe, Instagram, Facebook } from 'lucide-react';

// TikTok icon component (not in lucide-react)
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  );
}

interface ShopDrawerFooterProps {
  shop: Shop;
}

export function ShopDrawerFooter({ shop }: ShopDrawerFooterProps) {
  // Get social links - check shop first, then brand
  const website = shop.website || shop.brand?.website;
  const instagram = shop.instagram || shop.brand?.instagram;
  const facebook = shop.facebook || shop.brand?.facebook;
  const tiktok = shop.tiktok || shop.brand?.tiktok;

  // Build Google Maps directions URL
  // Prefer Place ID for most reliable linking, fallback to coordinates, then address
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

  // Normalize Instagram URL
  const getInstagramUrl = (handle: string) => {
    if (handle.startsWith('http')) return handle;
    const cleanHandle = handle.replace('@', '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '');
    return `https://instagram.com/${cleanHandle}`;
  };

  // Normalize Facebook URL
  const getFacebookUrl = (handle: string) => {
    if (handle.startsWith('http')) return handle;
    return `https://facebook.com/${handle}`;
  };

  // Normalize TikTok URL
  const getTikTokUrl = (handle: string) => {
    if (handle.startsWith('http')) return handle;
    const cleanHandle = handle.replace('@', '');
    return `https://tiktok.com/@${cleanHandle}`;
  };

  // Collect all available social buttons (excluding directions which is always shown if available)
  const socialButtons = [];

  if (tiktok) {
    socialButtons.push({
      key: 'tiktok',
      icon: TikTokIcon,
      url: getTikTokUrl(tiktok),
      label: 'TikTok',
      style: { background: '#000000' },
      textClass: 'text-white',
    });
  }

  if (facebook) {
    socialButtons.push({
      key: 'facebook',
      icon: Facebook,
      url: getFacebookUrl(facebook),
      label: 'Facebook',
      style: { background: '#1877F2' },
      textClass: 'text-white',
    });
  }

  if (website) {
    socialButtons.push({
      key: 'website',
      icon: Globe,
      url: website.startsWith('http') ? website : `https://${website}`,
      label: 'Website',
      style: { background: '#374151' },
      textClass: 'text-white',
    });
  }

  if (instagram) {
    socialButtons.push({
      key: 'instagram',
      icon: Instagram,
      url: getInstagramUrl(instagram),
      label: 'Instagram',
      style: { background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' },
      textClass: 'text-white',
    });
  }

  // Don't render footer if no links available
  if (!directionsUrl && socialButtons.length === 0) {
    return null;
  }

  return (
    <div className="sticky bottom-0 left-0 right-0 z-30 bg-background">
      {/* Shadow overlay above */}
      <div className="absolute -top-8 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none" />

      <div className="flex items-center justify-end gap-3 px-5 py-3">
        {/* Social buttons - left side */}
        {socialButtons.map(({ key, icon: Icon, url, label, style, textClass }) => (
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`w-11 h-11 rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-105 ${textClass}`}
            style={style}
            aria-label={label}
          >
            <Icon className="w-5 h-5" />
          </a>
        ))}

        {/* Directions button - rightmost with gradient */}
        {directionsUrl && (
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="directions-button w-11 h-11 rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105"
            aria-label="Get directions"
          >
            <Navigation className="w-5 h-5" />
          </a>
        )}
      </div>
    </div>
  );
}
