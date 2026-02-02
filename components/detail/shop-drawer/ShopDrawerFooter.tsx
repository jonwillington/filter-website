'use client';

import { Shop } from '@/lib/types';
import { Navigation } from 'lucide-react';

interface ShopDrawerFooterProps {
  shop: Shop;
}

export function ShopDrawerFooter({ shop }: ShopDrawerFooterProps) {
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

  // Don't render footer if no directions available
  if (!directionsUrl) {
    return null;
  }

  return (
    <div className="sticky bottom-0 left-0 right-0 z-30 bg-background">
      {/* Shadow overlay above */}
      <div className="absolute -top-8 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none" />

      <div className="flex items-center justify-end gap-3 px-5 py-3">
        {/* Directions button with gradient */}
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="directions-button w-9 h-9 rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105"
          aria-label="Get directions"
        >
          <Navigation className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
