'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Event } from '@/lib/types';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useDrawerTransition } from '@/lib/hooks/useDrawerTransition';
import { getMediaUrl } from '@/lib/utils';
import { format } from 'date-fns';
import { ArrowUpRight, MapPin, Calendar } from 'lucide-react';
import { CircleFlag } from 'react-circle-flags';

interface FeaturedEventsProps {
  events: Event[];
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  festival: 'Festival',
  competition: 'Competition',
  conference: 'Conference',
  workshop: 'Workshop',
  pop_up: 'Pop-up',
  cupping: 'Cupping',
  tasting: 'Tasting',
  meetup: 'Meetup',
  market: 'Market',
  other: 'Event',
};

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${format(start, 'd')}–${format(end, 'd MMMM yyyy')}`;
  }
  if (start.getFullYear() === end.getFullYear()) {
    return `${format(start, 'd MMM')} – ${format(end, 'd MMM yyyy')}`;
  }
  return `${format(start, 'd MMM yyyy')} – ${format(end, 'd MMM yyyy')}`;
}

export function FeaturedEvents({ events }: FeaturedEventsProps) {
  const { ref: sectionRef, revealed: sectionRevealed } = useScrollReveal();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const displayEvents = useMemo(() => {
    return [...events]
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
      .slice(0, 6);
  }, [events]);

  const effectiveSelectedId = selectedEventId ?? displayEvents[0]?.documentId ?? null;

  const selectedEvent = useMemo(() => {
    return displayEvents.find((e) => e.documentId === effectiveSelectedId) ?? displayEvents[0] ?? null;
  }, [displayEvents, effectiveSelectedId]);

  const { displayedItem, isTransitioning } = useDrawerTransition({
    item: selectedEvent,
    getKey: (e) => e?.documentId ?? '',
  });

  if (displayEvents.length === 0 || !displayedItem) return null;

  return (
    <div
      ref={sectionRef}
      style={{
        opacity: sectionRevealed ? 1 : 0,
        transform: sectionRevealed ? 'translateY(0)' : 'translateY(24px)',
        transition: 'opacity 0.7s ease-out, transform 0.7s ease-out',
      }}
    >
        {/* Mobile: horizontal scroll chips */}
        <div className="lg:hidden mb-6">
          <h2 className="font-display text-2xl md:text-3xl text-primary mb-4">
            Events
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
            {displayEvents.map((event) => {
              const isSelected = event.documentId === effectiveSelectedId;
              const imageUrl = getMediaUrl(event.image);
              return (
                <button
                  key={event.documentId}
                  onClick={() => setSelectedEventId(event.documentId)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-full flex-shrink-0 transition-all duration-200 max-w-[220px] ${
                    isSelected
                      ? 'bg-gray-200 dark:bg-white/[0.12] ring-1 ring-gray-300 dark:ring-white/20'
                      : 'bg-gray-100 dark:bg-white/[0.04] hover:bg-gray-150 dark:hover:bg-white/[0.07]'
                  }`}
                >
                  {imageUrl && (
                    <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-white/10">
                      <Image
                        src={imageUrl}
                        alt=""
                        width={20}
                        height={20}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  )}
                  <span className="text-sm font-medium text-primary truncate">
                    {event.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Card container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* LEFT: Header + Event list (desktop) */}
          <div className="hidden lg:flex lg:flex-col lg:col-span-4 bg-surface rounded-2xl border border-border-default overflow-hidden">
              {/* Header inside card */}
              <div className="px-6 pt-7 pb-5 border-b border-border-default">
                <h2 className="font-display text-2xl xl:text-3xl text-primary leading-none">
                  Events
                </h2>
                <p className="text-text-secondary text-sm mt-2">
                  What&apos;s coming up in specialty coffee
                </p>
              </div>

              {/* Event list */}
              <div className="flex-1 overflow-y-auto">
                {displayEvents.map((event, i) => {
                  const isSelected = event.documentId === effectiveSelectedId;
                  const typeLabel = event.event_type ? EVENT_TYPE_LABELS[event.event_type] || 'Event' : null;
                  const cityName = event.city?.name;
                  const countryCode = event.city?.country?.code?.toLowerCase();

                  return (
                    <button
                      key={event.documentId}
                      onClick={() => setSelectedEventId(event.documentId)}
                      className={`w-full text-left flex gap-3.5 px-5 py-4 transition-all duration-200 ${
                        isSelected
                          ? 'bg-gray-100 dark:bg-white/[0.06] border-l-2 border-l-accent'
                          : 'hover:bg-gray-50 dark:hover:bg-white/[0.03] border-l-2 border-l-transparent'
                      } ${i < displayEvents.length - 1 ? 'border-b border-border-default' : ''}`}
                    >
                      {/* Date badge */}
                      <div className="flex-shrink-0 mt-0.5 w-11 h-11 rounded-lg bg-gray-100 dark:bg-white/10 flex flex-col items-center justify-center">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary leading-none">
                          {format(new Date(event.start_date), 'MMM')}
                        </span>
                        <span className="text-base font-semibold text-primary leading-tight">
                          {format(new Date(event.start_date), 'd')}
                        </span>
                      </div>

                      {/* Text content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-xs mb-1">
                          {typeLabel && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-border-default bg-white dark:bg-white/10 text-[11px] font-mono text-primary flex-shrink-0">
                              {typeLabel}
                            </span>
                          )}
                          {event.is_free && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-[11px] font-mono text-green-700 dark:text-green-400 flex-shrink-0">
                              Free
                            </span>
                          )}
                          {cityName && (
                            <span className="flex items-center gap-1 text-text-secondary truncate">
                              {cityName}
                              {countryCode && (
                                <span className="inline-block w-3 h-3 flex-shrink-0"><CircleFlag countryCode={countryCode} width="12" height="12" /></span>
                              )}
                            </span>
                          )}
                        </div>

                        <p className="text-sm font-medium line-clamp-2 leading-snug text-primary">
                          {event.name}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

          {/* RIGHT: Event detail with crossfade */}
          <div className="lg:col-span-8 bg-surface rounded-2xl border border-border-default overflow-hidden">
            <div
              className="transition-opacity duration-200 ease-in-out"
              style={{ opacity: isTransitioning ? 0 : 1 }}
            >
              <EventDetail event={displayedItem} />
            </div>
          </div>
        </div>
    </div>
  );
}

function EventDetail({ event }: { event: Event }) {
  const imageUrl = getMediaUrl(event.image);
  const cityName = event.city?.name;
  const countryCode = event.city?.country?.code?.toLowerCase();
  const typeLabel = event.event_type
    ? EVENT_TYPE_LABELS[event.event_type] || 'Event'
    : null;

  return (
    <div>
      {/* Event image */}
      {imageUrl && (
        <div className="relative w-full aspect-[16/9] overflow-hidden bg-gray-100 dark:bg-white/5">
          <Image
            src={imageUrl}
            alt={event.name}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 58vw"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-6 md:p-8 space-y-5">
        {/* Date + location row */}
        <div className="flex items-center gap-4 text-sm text-text-secondary">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            {formatDateRange(event.start_date, event.end_date)}
          </span>
          {cityName && (
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              {cityName}
              {countryCode && (
                <span className="inline-block w-3.5 h-3.5 flex-shrink-0"><CircleFlag countryCode={countryCode} width="14" height="14" /></span>
              )}
              {event.physicalLocation && ` · ${event.physicalLocation}`}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-display text-2xl md:text-3xl text-primary leading-tight">
          {event.name}
        </h3>

        {/* Chips row */}
        <div className="flex flex-wrap items-center gap-2">
          {typeLabel && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full border border-border-default text-xs font-mono text-primary">
              {typeLabel}
            </span>
          )}
          {event.is_free && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-xs font-mono text-green-700 dark:text-green-400">
              Free
            </span>
          )}
          {event.eventHostBrand?.name && (
            <span className="text-sm text-text-secondary">
              Hosted by {event.eventHostBrand.name}
            </span>
          )}
        </div>

        {/* Description */}
        {event.description && (
          <p className="text-sm text-primary leading-relaxed whitespace-pre-wrap">
            {event.description}
          </p>
        )}

        {/* Website link */}
        {event.website && (
          <a
            href={event.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
          >
            Visit website
            <ArrowUpRight className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
}
