'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronRight, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Event } from '@/lib/types';
import { EventModal } from '@/components/events';
import { getMediaUrl } from '@/lib/utils';
import { formatEventTime } from '@/lib/utils/eventDateUtils';
import { getFlagUrl } from './types';

interface EventsViewProps {
  eventsThisYear: Event[];
}

export function EventsView({ eventsThisYear }: EventsViewProps) {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  return (
    <>
      <div className="py-2">
        {eventsThisYear.length === 0 ? (
          <div className="text-center py-12 text-text-secondary">
            No events scheduled for {new Date().getFullYear()}
          </div>
        ) : (
          <div>
            {eventsThisYear.map((event) => {
              const imageUrl = getMediaUrl(event.image);
              const startDate = new Date(event.start_date);
              const monthLabel = format(startDate, 'MMM').toUpperCase();
              const dayLabel = format(startDate, 'd');
              const timeLabel = formatEventTime(event.start_date);
              const eventCity = event.city;
              const countryCode = eventCity?.country?.code;

              return (
                <button
                  key={event.documentId}
                  onClick={() => setSelectedEvent(event)}
                  className="group w-full flex items-center gap-4 py-3 px-4 lg:px-6 transition-colors hover:bg-surface border-b border-border-default last:border-b-0"
                >
                  {/* Date column - calendar style */}
                  <div className="w-12 flex-shrink-0 text-center">
                    <div className="text-xs font-medium text-accent uppercase tracking-wide">
                      {monthLabel}
                    </div>
                    <div className="text-2xl font-semibold text-primary leading-tight">
                      {dayLabel}
                    </div>
                  </div>

                  {/* Event details */}
                  <div className="flex-1 min-w-0 text-left">
                    <h4 className="font-medium text-primary text-base leading-tight line-clamp-2 group-hover:text-accent transition-colors">
                      {event.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1 text-sm text-text-secondary">
                      <span>{timeLabel}</span>
                    </div>
                    {eventCity && (
                      <div className="flex items-center gap-1.5 mt-1">
                        {countryCode && getFlagUrl(countryCode) && (
                          <div className="w-4 h-4 rounded-full overflow-hidden flex-shrink-0">
                            <Image
                              src={getFlagUrl(countryCode)!}
                              alt={eventCity.country?.name || ''}
                              width={16}
                              height={16}
                              className="object-cover w-full h-full"
                              unoptimized
                            />
                          </div>
                        )}
                        <span className="text-sm text-text-secondary">
                          {eventCity.name}
                          {eventCity.country && `, ${eventCity.country.name}`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Event image - right side (banner format) */}
                  <div className="relative w-24 h-14 lg:w-32 lg:h-20 flex-shrink-0 rounded-lg overflow-hidden bg-surface">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={event.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-text-secondary" />
                      </div>
                    )}
                  </div>

                  {/* Arrow indicator */}
                  <ChevronRight className="w-4 h-4 flex-shrink-0 text-border-default group-hover:text-accent transition-colors" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      <EventModal
        event={selectedEvent}
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </>
  );
}
