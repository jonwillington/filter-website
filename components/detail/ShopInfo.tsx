import { Shop, OpeningHours } from '@/lib/types';
import { MapPin, Clock, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface ShopInfoProps {
  shop: Shop;
}

function isOpeningHoursObject(hours: unknown): hours is OpeningHours {
  return typeof hours === 'object' && hours !== null && !Array.isArray(hours);
}

function getTodayHours(hours: OpeningHours | null | unknown): string | null {
  if (!hours) return null;

  // Get today's day name (Monday, Tuesday, etc.)
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = dayNames[new Date().getDay()];

  // Handle array format: ["Monday: 10:00 AM – 9:00 PM", ...]
  if (Array.isArray(hours)) {
    const todayEntry = hours.find((entry) =>
      typeof entry === 'string' && entry.startsWith(today + ':')
    );
    if (todayEntry) {
      // Extract hours after "Monday: " -> "10:00 AM – 9:00 PM"
      return todayEntry.substring(today.length + 2).trim();
    }
    return null;
  }

  // Handle object format
  if (typeof hours === 'object' && hours !== null) {
    // Check for pre-computed today/display fields
    if ('today' in hours && (hours as any).today) return (hours as any).today;
    if ('display' in hours && (hours as any).display) return (hours as any).display;

    // Get hours for today from day-based object
    if (today in hours) {
      return (hours as any)[today];
    }
  }

  return null;
}

export function ShopInfo({ shop }: ShopInfoProps) {
  const [hoursExpanded, setHoursExpanded] = useState(false);

  // Pass raw opening_hours - getTodayHours handles both array and object formats
  const todayHours = getTodayHours(shop.opening_hours);
  const hasOpeningHours = Array.isArray(shop.opening_hours) && shop.opening_hours.length > 0;

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
      {hasOpeningHours && (
        <div>
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-text text-sm">
                  {todayHours || 'Hours not available'}
                </span>
                <button
                  onClick={() => setHoursExpanded(!hoursExpanded)}
                  className="flex items-center gap-1 text-xs text-accent hover:text-secondary transition-colors ml-2"
                >
                  {hoursExpanded ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>

              {/* All days - expandable */}
              {hoursExpanded && Array.isArray(shop.opening_hours) && (
                <div className="mt-2 space-y-1 pl-0">
                  {shop.opening_hours.map((entry, index) => {
                    if (typeof entry !== 'string') return null;
                    const [day, hours] = entry.split(':').map(s => s.trim());
                    return (
                      <div key={index} className="flex justify-between text-xs">
                        <span className="text-textSecondary">{day}</span>
                        <span className="text-text">{hours}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
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
