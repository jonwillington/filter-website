import { Shop, OpeningHours } from '@/lib/types';
import { MapPin, Clock, Star } from 'lucide-react';
import { Chip } from '@heroui/react';

interface ShopInfoProps {
  shop: Shop;
}

function isOpeningHoursObject(hours: unknown): hours is OpeningHours {
  return typeof hours === 'object' && hours !== null && !Array.isArray(hours);
}

export function ShopInfo({ shop }: ShopInfoProps) {
  const openingHours = isOpeningHoursObject(shop.opening_hours) ? shop.opening_hours : null;
  const todayHours = openingHours?.today ?? openingHours?.display;

  const coords = shop.coordinates ?? (shop.latitude && shop.longitude
    ? { lat: shop.latitude, lng: shop.longitude }
    : null);

  const mapsUrl = coords
    ? `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`
    : shop.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.address)}`
      : null;

  return (
    <div className="space-y-3">
      {/* Address */}
      {shop.address && (
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
          {mapsUrl ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text hover:text-accent transition-colors text-sm leading-relaxed"
            >
              {shop.address}
            </a>
          ) : (
            <span className="text-text text-sm leading-relaxed">{shop.address}</span>
          )}
        </div>
      )}

      {/* Opening Hours */}
      {todayHours && (
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-accent flex-shrink-0" />
          <span className="text-text text-sm">{todayHours}</span>
        </div>
      )}

      {/* Google Rating */}
      {shop.google_rating && (
        <div className="flex items-center gap-3">
          <Star className="w-5 h-5 text-accent flex-shrink-0" />
          <span className="text-text text-sm">
            {shop.google_rating.toFixed(1)}
            <span className="text-yellow-500 ml-1">★</span>
            {shop.google_review_count && (
              <span className="text-textSecondary ml-1">
                ({shop.google_review_count.toLocaleString()} reviews)
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
