'use client';

import Image from 'next/image';
import { Event } from '@/lib/types';
import { getMediaUrl } from '@/lib/utils';
import { useEventCountdown } from '@/lib/hooks/useEventCountdown';
import {
  getEventDateLabel,
  formatEventTime,
  isEventToday,
  isEventTomorrow,
} from '@/lib/utils/eventDateUtils';
import { Calendar, MapPin, Clock } from 'lucide-react';

interface EventCardProps {
  event: Event;
  onClick: () => void;
  primaryColor?: string;
}

export function EventCard({ event, onClick, primaryColor }: EventCardProps) {
  const { formattedCountdown, isWithinWeek } = useEventCountdown(event.start_date);
  const dateLabel = getEventDateLabel(event.start_date, event.end_date);
  const timeLabel = formatEventTime(event.start_date);
  const isToday = isEventToday(event.start_date);
  const isTomorrow = isEventTomorrow(event.start_date);

  const imageUrl = getMediaUrl(event.image);
  const brandLogoUrl = getMediaUrl(event.eventHostBrand?.logo);

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-surface border border-border-default rounded-xl overflow-hidden transition-all duration-200 hover:shadow-md hover:border-gray-300 dark:hover:border-white/20 group"
    >
      {/* Event image banner */}
      {imageUrl && (
        <div className="relative w-full h-[120px] overflow-hidden">
          <Image
            src={imageUrl}
            alt={event.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {/* Gradient overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Date/Time row with badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Today/Tomorrow badge */}
          {(isToday || isTomorrow) && (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: primaryColor || '#8B6F47' }}
            >
              {isToday ? 'Today' : 'Tomorrow'}
            </span>
          )}

          {/* Countdown badge (if within a week but not today/tomorrow) */}
          {isWithinWeek && formattedCountdown && !isToday && !isTomorrow && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              <Clock size={10} />
              {formattedCountdown}
            </span>
          )}

          {/* Free badge */}
          {event.is_free && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
              Free
            </span>
          )}
        </div>

        {/* Event name */}
        <h4 className="font-semibold text-primary text-base leading-tight line-clamp-2">
          {event.name}
        </h4>

        {/* Date and location info */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Calendar size={14} className="flex-shrink-0" />
            <span>
              {dateLabel} · {timeLabel}
            </span>
          </div>

          {event.physicalLocation && (
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <MapPin size={14} className="flex-shrink-0" />
              <span className="line-clamp-1">{event.physicalLocation}</span>
            </div>
          )}
        </div>

        {/* Host brand */}
        {event.eventHostBrand && (
          <div className="flex items-center gap-2 pt-2 border-t border-border-default">
            {brandLogoUrl ? (
              <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-100 dark:bg-white/10 flex-shrink-0">
                <Image
                  src={brandLogoUrl}
                  alt={event.eventHostBrand.name}
                  width={24}
                  height={24}
                  className="object-cover"
                />
              </div>
            ) : (
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white flex-shrink-0"
                style={{ backgroundColor: primaryColor || '#8B6F47' }}
              >
                {event.eventHostBrand.name.charAt(0)}
              </div>
            )}
            <span className="text-sm text-text-secondary">
              Hosted by{' '}
              <span className="font-medium text-primary">
                {event.eventHostBrand.name}
              </span>
            </span>
          </div>
        )}
      </div>
    </button>
  );
}
