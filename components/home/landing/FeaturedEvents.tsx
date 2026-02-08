'use client';

import Image from 'next/image';
import { Event } from '@/lib/types';
import { getMediaUrl } from '@/lib/utils';
import { getEventDateLabel } from '@/lib/utils/eventDateUtils';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { Calendar, MapPin } from 'lucide-react';

interface FeaturedEventsProps {
  events: Event[];
}

export function FeaturedEvents({ events }: FeaturedEventsProps) {
  const { ref: headingRef, revealed: headingRevealed } = useScrollReveal();
  const { ref: listRef, revealed: listRevealed } = useScrollReveal(0.05);

  if (events.length === 0) return null;

  return (
    <section className="px-6 pt-16 pb-24 md:px-12 md:pt-20 md:pb-32 lg:px-24 lg:pt-28 lg:pb-40 border-t border-border-default" style={{ background: 'var(--surface-landing)' }}>
      <h2
        ref={headingRef}
        className="font-display text-5xl md:text-6xl lg:text-8xl text-primary mb-12 md:mb-16 lg:mb-18"
        style={{
          opacity: headingRevealed ? 1 : 0,
          transform: headingRevealed ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.8s ease-out, transform 0.8s ease-out',
        }}
      >
        Upcoming events
      </h2>

      <div ref={listRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        {events.map((event, i) => (
          <EventLandingCard
            key={event.documentId}
            event={event}
            index={i}
            revealed={listRevealed}
          />
        ))}
      </div>
    </section>
  );
}

function EventLandingCard({
  event,
  index,
  revealed,
}: {
  event: Event;
  index: number;
  revealed: boolean;
}) {
  const imageUrl = getMediaUrl(event.image);
  const brandLogoUrl = getMediaUrl(event.eventHostBrand?.logo);
  const dateLabel = getEventDateLabel(event.start_date, event.end_date);
  const cityName = event.city?.name;

  return (
    <a
      href={event.website || undefined}
      target={event.website ? '_blank' : undefined}
      rel={event.website ? 'noopener noreferrer' : undefined}
      className="group block"
      style={{
        opacity: revealed ? 1 : 0,
        transform: revealed ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 0.6s ease-out ${index * 0.07}s, transform 0.6s ease-out ${index * 0.07}s`,
      }}
    >
      {/* Image */}
      <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-gray-100 dark:bg-white/5">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={event.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-contrastBlock">
            <Calendar className="w-10 h-10 text-contrastText/30" />
          </div>
        )}

        {/* Date badge */}
        <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/90 dark:bg-black/70 backdrop-blur-sm text-xs font-medium text-primary">
          {dateLabel}
        </div>

        {/* Free badge */}
        {event.is_free && (
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-green-500 text-white text-xs font-medium">
            Free
          </div>
        )}
      </div>

      {/* Text below */}
      <div className="mt-3">
        <h3 className="text-lg font-medium text-primary line-clamp-2 group-hover:text-accent transition-colors">
          {event.name}
        </h3>

        <div className="flex items-center gap-3 mt-1.5 text-sm text-text-secondary">
          {cityName && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {cityName}
            </span>
          )}
          {event.event_type && (
            <span className="capitalize">{event.event_type.replace(/_/g, ' ')}</span>
          )}
        </div>

        {/* Host brand */}
        {event.eventHostBrand && (
          <div className="flex items-center gap-2 mt-2">
            {brandLogoUrl ? (
              <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-100 dark:bg-white/10 flex-shrink-0">
                <Image
                  src={brandLogoUrl}
                  alt={event.eventHostBrand.name}
                  width={20}
                  height={20}
                  className="object-cover w-full h-full"
                />
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium bg-accent text-white flex-shrink-0">
                {event.eventHostBrand.name.charAt(0)}
              </div>
            )}
            <span className="text-xs text-text-secondary">
              Hosted by {event.eventHostBrand.name}
            </span>
          </div>
        )}
      </div>
    </a>
  );
}
