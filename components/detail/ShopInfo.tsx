import { Shop, OpeningHours } from '@/lib/types';
import { MapPin, Clock, Phone, Star } from 'lucide-react';
import { Chip } from '@heroui/react';

interface ShopInfoProps {
  shop: Shop;
}

function isOpeningHoursObject(hours: unknown): hours is OpeningHours {
  return typeof hours === 'object' && hours !== null && !Array.isArray(hours);
}

export function ShopInfo({ shop }: ShopInfoProps) {
  const openingHours = isOpeningHoursObject(shop.opening_hours) ? shop.opening_hours : null;
  const isOpen = shop.is_open ?? openingHours?.open_now;
  const todayHours = openingHours?.today ?? openingHours?.display;

  return (
    <div className="space-y-4">
      {/* Address */}
      {shop.address && (
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              shop.address
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-text hover:text-accent transition-colors text-sm leading-relaxed"
          >
            {shop.address}
          </a>
        </div>
      )}

      {/* Opening Hours */}
      {(todayHours || isOpen !== undefined) && (
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-accent flex-shrink-0" />
          <div className="flex items-center gap-2 flex-wrap">
            {isOpen !== undefined && (
              <Chip
                size="sm"
                color={isOpen ? 'success' : 'default'}
                variant="flat"
              >
                {isOpen ? 'Open now' : 'Closed'}
              </Chip>
            )}
            {todayHours && (
              <span className="text-textSecondary text-sm">{todayHours}</span>
            )}
          </div>
        </div>
      )}

      {/* Phone */}
      {shop.phone && (
        <div className="flex items-center gap-3">
          <Phone className="w-5 h-5 text-accent flex-shrink-0" />
          <a
            href={`tel:${shop.phone}`}
            className="text-text hover:text-accent transition-colors text-sm"
          >
            {shop.phone}
          </a>
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
