import { Shop } from '@/lib/types';
import { MapPin, Star } from 'lucide-react';

interface ShopInfoProps {
  shop: Shop;
}

export function ShopInfo({ shop }: ShopInfoProps) {
  const coords = shop.coordinates ?? (shop.latitude && shop.longitude
    ? { lat: shop.latitude, lng: shop.longitude }
    : null);

  // Prefer Place ID for most reliable linking, fallback to coordinates, then address
  const mapsUrl = shop.google_place_id
    ? `https://www.google.com/maps/place/?q=place_id:${shop.google_place_id}`
    : coords
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
              className="text-text hover:text-accent transition-colors text-sm leading-snug"
            >
              {shop.address}
            </a>
          ) : (
            <span className="text-text text-sm leading-snug">{shop.address}</span>
          )}
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
