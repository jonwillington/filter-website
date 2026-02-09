'use client';

import { useMemo } from 'react';
import { Event } from '@/lib/types';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { format } from 'date-fns';
import { ArrowUpRight, MapPin } from 'lucide-react';

interface FeaturedEventsProps {
  events: Event[];
}

interface MonthGroup {
  label: string;       // "March", "May", etc.
  year: number;
  events: Event[];
}

export function FeaturedEvents({ events }: FeaturedEventsProps) {
  const { ref: headingRef, revealed: headingRevealed } = useScrollReveal();
  const { ref: listRef, revealed: listRevealed } = useScrollReveal(0.05);

  // Group events by month
  const monthGroups = useMemo<MonthGroup[]>(() => {
    const groups = new Map<string, MonthGroup>();

    for (const event of events) {
      const date = new Date(event.start_date);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (!groups.has(key)) {
        groups.set(key, {
          label: format(date, 'MMMM'),
          year: date.getFullYear(),
          events: [],
        });
      }
      groups.get(key)!.events.push(event);
    }

    return Array.from(groups.values());
  }, [events]);

  if (events.length === 0) return null;

  // Running index for stagger delay across all events
  let eventIndex = 0;

  return (
    <section
      className="px-6 pt-16 pb-24 md:px-12 md:pt-20 md:pb-32 lg:px-24 lg:pt-28 lg:pb-40 border-t border-border-default"
      style={{ background: 'var(--surface-landing)' }}
    >
      <h2
        ref={headingRef}
        className="font-display text-5xl md:text-6xl lg:text-8xl text-primary mb-4 md:mb-6"
        style={{
          opacity: headingRevealed ? 1 : 0,
          transform: headingRevealed ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.8s ease-out, transform 0.8s ease-out',
        }}
      >
        The year ahead
      </h2>

      <p
        className="text-base md:text-lg text-text-secondary mb-12 md:mb-16 lg:mb-18 max-w-xl"
        style={{
          opacity: headingRevealed ? 1 : 0,
          transform: headingRevealed ? 'translateY(0)' : 'translateY(12px)',
          transition: 'opacity 0.8s ease-out 0.15s, transform 0.8s ease-out 0.15s',
        }}
      >
        Coffee festivals, competitions and gatherings worth planning your year around.
      </p>

      <div ref={listRef}>
        {monthGroups.map((group) => (
          <div key={`${group.year}-${group.label}`}>
            {group.events.map((event) => {
              const idx = eventIndex++;
              const start = new Date(event.start_date);
              const end = new Date(event.end_date);
              const dayRange = start.getMonth() === end.getMonth()
                ? `${format(start, 'd')}–${format(end, 'd')}`
                : `${format(start, 'MMM d')}–${format(end, 'MMM d')}`;
              const cityName = event.city?.name;
              const typeLabel = event.event_type
                ? event.event_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                : null;

              return (
                <a
                  key={event.documentId}
                  href={event.website || undefined}
                  target={event.website ? '_blank' : undefined}
                  rel={event.website ? 'noopener noreferrer' : undefined}
                  className="group flex items-start gap-4 md:gap-0 py-5 md:py-6 border-b border-border-default first:border-t"
                  style={{
                    opacity: listRevealed ? 1 : 0,
                    transform: listRevealed ? 'translateY(0)' : 'translateY(14px)',
                    transition: `opacity 0.5s ease-out ${idx * 0.06}s, transform 0.5s ease-out ${idx * 0.06}s`,
                  }}
                >
                  {/* Date column */}
                  <div className="flex-shrink-0 w-20 md:w-32">
                    <span className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
                      {format(start, 'MMM')}
                    </span>
                    <p className="font-display text-2xl md:text-3xl text-primary leading-tight">
                      {dayRange}
                    </p>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 md:pl-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-display text-xl md:text-2xl lg:text-3xl text-primary leading-tight group-hover:text-accent transition-colors">
                          {event.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                          {cityName && (
                            <span className="flex items-center gap-1.5 text-sm text-text-secondary">
                              <MapPin className="w-3.5 h-3.5" />
                              {cityName}
                            </span>
                          )}
                          {typeLabel && (
                            <span className="text-sm text-text-secondary">{typeLabel}</span>
                          )}
                          {event.is_free && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                              Free
                            </span>
                          )}
                          {event.eventHostBrand?.name && (
                            <span className="text-sm text-text-secondary">
                              by {event.eventHostBrand.name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Arrow */}
                      {event.website && (
                        <ArrowUpRight className="w-5 h-5 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                      )}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
