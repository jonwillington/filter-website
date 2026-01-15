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
      className="w-full text-left transition-all duration-200 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg py-3 group"
    >
      <div className="flex gap-3">
        {/* Content - left side */}
        <div className="flex-1 min-w-0 space-y-2">
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
          <h4 className="font-medium text-primary text-[15px] leading-tight line-clamp-2">
            {event.name}
          </h4>

          {/* Date and location info */}
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs text-text-secondary">
              <Calendar size={12} className="flex-shrink-0" />
              <span>
                {dateLabel} · {timeLabel}
              </span>
            </div>

            {event.physicalLocation && (
              <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                <MapPin size={12} className="flex-shrink-0" />
                <span className="line-clamp-1">{event.physicalLocation}</span>
              </div>
            )}
          </div>

          {/* Host brand */}
          {event.eventHostBrand && (
            <div className="flex items-center gap-2 pt-1">
              {brandLogoUrl ? (
                <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-100 dark:bg-white/10 flex-shrink-0">
                  <Image
                    src={brandLogoUrl}
                    alt={event.eventHostBrand.name}
                    width={20}
                    height={20}
                    className="object-cover"
                  />
                </div>
              ) : (
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium text-white flex-shrink-0"
                  style={{ backgroundColor: primaryColor || '#8B6F47' }}
                >
                  {event.eventHostBrand.name.charAt(0)}
                </div>
              )}
              <span className="text-xs text-text-secondary">
                {event.eventHostBrand.name}
              </span>
            </div>
          )}
        </div>

        {/* Image - right side (always show, with placeholder) */}
        <div className="relative w-28 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-white/10">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={event.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-300 dark:text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
