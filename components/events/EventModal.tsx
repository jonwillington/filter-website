'use client';

import Image from 'next/image';
import { ModalBody, Button, Divider } from '@heroui/react';
import { Event } from '@/lib/types';
import { ResponsiveModal } from '@/components/ui/ResponsiveModal';
import { getMediaUrl } from '@/lib/utils';
import {
  getEventDateLabel,
  formatEventTime,
  isEventToday,
  isEventTomorrow,
} from '@/lib/utils/eventDateUtils';
import { useEventCountdown } from '@/lib/hooks/useEventCountdown';
import {
  Calendar,
  MapPin,
  Clock,
  ExternalLink,
  Mail,
  Ticket,
  Users,
} from 'lucide-react';

interface EventModalProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
  primaryColor?: string;
}

export function EventModal({ event, isOpen, onClose, primaryColor }: EventModalProps) {
  if (!event) return null;

  const { formattedCountdown, isWithinWeek } = useEventCountdown(event.start_date);
  const dateLabel = getEventDateLabel(event.start_date, event.end_date);
  const timeLabel = formatEventTime(event.start_date);
  const isToday = isEventToday(event.start_date);
  const isTomorrow = isEventTomorrow(event.start_date);

  const imageUrl = getMediaUrl(event.image);
  const brandLogoUrl = getMediaUrl(event.eventHostBrand?.logo);
  const accentColor = primaryColor || '#8B6F47';

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      modalClassNames={{
        base: 'bg-background',
      }}
    >
      <ModalBody className="p-0 overflow-y-auto">
        {/* Header image */}
        {imageUrl && (
          <div className="relative w-full h-[200px] flex-shrink-0">
            <Image
              src={imageUrl}
              alt={event.name}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap">
            {(isToday || isTomorrow) && (
              <span
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: accentColor }}
              >
                {isToday ? 'Today' : 'Tomorrow'}
              </span>
            )}

            {isWithinWeek && formattedCountdown && !isToday && !isTomorrow && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                <Clock size={12} />
                Starts in {formattedCountdown}
              </span>
            )}

            {event.is_free && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                Free Event
              </span>
            )}

            {event.event_type && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300 capitalize">
                {event.event_type}
              </span>
            )}
          </div>

          {/* Event name */}
          <h2
            className="text-primary"
            style={{
              fontFamily: 'PPNeueYork, serif',
              fontSize: '24px',
              fontWeight: 600,
              letterSpacing: '-0.5px',
              lineHeight: 1.2,
            }}
          >
            {event.name}
          </h2>

          {/* Date and location info */}
          <div className="space-y-3">
            <div className="flex items-start gap-3 text-sm">
              <Calendar size={18} className="flex-shrink-0 text-text-secondary mt-0.5" />
              <div>
                <p className="font-medium text-primary">{dateLabel}</p>
                <p className="text-text-secondary">{timeLabel}</p>
              </div>
            </div>

            {event.physicalLocation && (
              <div className="flex items-start gap-3 text-sm">
                <MapPin size={18} className="flex-shrink-0 text-text-secondary mt-0.5" />
                <p className="text-primary">{event.physicalLocation}</p>
              </div>
            )}
          </div>

          {/* Description */}
          {event.description && (
            <>
              <Divider className="bg-border-default" />
              <div>
                <h3 className="text-sm font-medium text-primary mb-2">About</h3>
                <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
                  {event.description}
                </p>
              </div>
            </>
          )}

          {/* Host brand section */}
          {event.eventHostBrand && (
            <>
              <Divider className="bg-border-default" />
              <div>
                <h3 className="text-sm font-medium text-primary mb-3">Hosted by</h3>
                <div className="flex items-center gap-3">
                  {brandLogoUrl ? (
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-white/10 flex-shrink-0">
                      <Image
                        src={brandLogoUrl}
                        alt={event.eventHostBrand.name}
                        width={48}
                        height={48}
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-medium text-white flex-shrink-0"
                      style={{ backgroundColor: accentColor }}
                    >
                      {event.eventHostBrand.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-primary">
                      {event.eventHostBrand.name}
                    </p>
                    {event.eventHostBrand.description && (
                      <p className="text-sm text-text-secondary line-clamp-1">
                        {event.eventHostBrand.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Brand links */}
                {(event.eventHostBrand.website || event.eventHostBrand.instagram) && (
                  <div className="flex items-center gap-3 mt-3">
                    {event.eventHostBrand.website && (
                      <a
                        href={event.eventHostBrand.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary transition-colors"
                      >
                        <ExternalLink size={14} />
                        Website
                      </a>
                    )}
                    {event.eventHostBrand.instagram && (
                      <a
                        href={`https://instagram.com/${event.eventHostBrand.instagram.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary transition-colors"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                        </svg>
                        Instagram
                      </a>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Ticket info */}
          {(event.ticket_price || event.max_attendees || event.ticketsAvailable !== undefined) && (
            <>
              <Divider className="bg-border-default" />
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-primary mb-2">Tickets</h3>

                {!event.is_free && event.ticket_price && (
                  <div className="flex items-center gap-2 text-sm">
                    <Ticket size={16} className="text-text-secondary" />
                    <span className="text-primary font-medium">
                      ${event.ticket_price}
                    </span>
                  </div>
                )}

                {event.max_attendees && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users size={16} className="text-text-secondary" />
                    <span className="text-text-secondary">
                      {event.max_attendees} max attendees
                    </span>
                  </div>
                )}

                {event.ticketsAvailable !== undefined && (
                  <p className="text-sm">
                    {event.ticketsAvailable ? (
                      <span className="text-green-600 dark:text-green-400">
                        Tickets available
                      </span>
                    ) : (
                      <span className="text-red-600 dark:text-red-400">
                        Sold out
                      </span>
                    )}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Contact email */}
          {event.contact_email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail size={16} className="text-text-secondary" />
              <a
                href={`mailto:${event.contact_email}`}
                className="text-text-secondary hover:text-primary transition-colors"
              >
                {event.contact_email}
              </a>
            </div>
          )}

          {/* Learn more button */}
          {event.website && (
            <div className="pt-2">
              <Button
                as="a"
                href={event.website}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full font-medium text-white"
                style={{ backgroundColor: accentColor }}
                endContent={<ExternalLink size={16} />}
              >
                Learn More
              </Button>
            </div>
          )}
        </div>
      </ModalBody>
    </ResponsiveModal>
  );
}
