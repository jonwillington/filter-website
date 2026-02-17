'use client';

import { useState } from 'react';
import { ModalBody, ScrollShadow } from '@heroui/react';
import { Check } from 'lucide-react';
import { Location, Country, Shop, Event } from '@/lib/types';
import { ResponsiveModal, ModalAnnouncementBanner, CircularCloseButton } from '@/components/ui';
import { cn } from '@/lib/utils';
import { ViewMode, SortDirection } from './types';
import { useExploreData } from './useExploreData';
import { RegionView } from './RegionView';
import { RatingView } from './RatingView';
import { EventsView } from './EventsView';

interface ExploreModalProps {
  isOpen: boolean;
  onClose: () => void;
  locations: Location[];
  countries?: Country[];
  allShops?: Shop[];
  events?: Event[];
  onLocationSelect: (location: Location) => void;
}

export function ExploreModal({
  isOpen,
  onClose,
  locations,
  countries = [],
  allShops = [],
  events = [],
  onLocationSelect,
}: ExploreModalProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('region');
  const [sortDirection, setSortDirection] = useState<SortDirection>('best');

  const {
    shopCountByLocation,
    groupedData,
    locationsByRating,
    eventsThisYear,
  } = useExploreData({
    locations,
    countries,
    allShops,
    events,
    sortDirection,
  });

  const handleLocationClick = (location: Location) => {
    onLocationSelect(location);
    onClose();
  };

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      size="5xl"
      modalClassNames={{
        wrapper: 'z-[1100]',
        backdrop: 'bg-black/60 backdrop-blur-sm z-[1100]',
        base: 'max-h-[90vh] overflow-hidden bg-[#5D4A38]',
      }}
      hideCloseButton
    >
      {/* Announcement banner - sits "behind" the main content */}
      <ModalAnnouncementBanner variant="light" icon={<Check className="w-4 h-4" />}>
        1,000+ locations are being added throughout 2026 to Filter
      </ModalAnnouncementBanner>

      {/* Main content wrapper - overlaps the banner with rounded top corners */}
      <div className="rounded-t-2xl -mt-3 relative flex flex-col min-h-0 flex-1" style={{ backgroundColor: 'var(--surface-warm)' }}>
        <CircularCloseButton
          onPress={onClose}
          size="sm"
          className="absolute top-3 right-3 z-20"
        />

        {/* Header with filter chips */}
        <div className="sticky top-0 z-10 rounded-t-2xl border-b border-border-default" style={{ backgroundColor: 'var(--surface-warm)' }}>
          <div className="px-6 py-5 lg:py-6 space-y-4">
            <h2 className="text-xl lg:text-2xl font-display" style={{ color: 'var(--text)' }}>
              Where to?
            </h2>

            {/* Filter chips */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('region')}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
                    viewMode === 'region'
                      ? 'bg-contrastBlock text-contrastText'
                      : 'bg-white dark:bg-white/10 text-text-secondary border border-border-default hover:border-text-secondary'
                  )}
                >
                  By region
                </button>
                <button
                  onClick={() => setViewMode('rating')}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
                    viewMode === 'rating'
                      ? 'bg-contrastBlock text-contrastText'
                      : 'bg-white dark:bg-white/10 text-text-secondary border border-border-default hover:border-text-secondary'
                  )}
                >
                  By rating
                </button>
                <button
                  onClick={() => setViewMode('events')}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
                    viewMode === 'events'
                      ? 'bg-contrastBlock text-contrastText'
                      : 'bg-white dark:bg-white/10 text-text-secondary border border-border-default hover:border-text-secondary'
                  )}
                >
                  Events
                </button>
              </div>

              {/* Sort options - only visible in rating view */}
              {viewMode === 'rating' && (
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-text-secondary hidden sm:inline">Sort:</span>
                  <button
                    onClick={() => setSortDirection('best')}
                    className={cn(
                      'px-3 py-1 rounded-full transition-colors',
                      sortDirection === 'best'
                        ? 'bg-surface text-primary font-medium'
                        : 'text-text-secondary hover:text-primary'
                    )}
                  >
                    Best
                  </button>
                  <button
                    onClick={() => setSortDirection('worst')}
                    className={cn(
                      'px-3 py-1 rounded-full transition-colors',
                      sortDirection === 'worst'
                        ? 'bg-surface text-primary font-medium'
                        : 'text-text-secondary hover:text-primary'
                    )}
                  >
                    Worst
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <ModalBody className="p-0">
          <ScrollShadow className="max-h-[75vh]">
            {viewMode === 'region' && (
              <RegionView
                groupedData={groupedData}
                onLocationSelect={handleLocationClick}
              />
            )}

            {viewMode === 'rating' && (
              <RatingView
                locationsByRating={locationsByRating}
                shopCountByLocation={shopCountByLocation}
                onLocationSelect={handleLocationClick}
              />
            )}

            {viewMode === 'events' && (
              <EventsView eventsThisYear={eventsThisYear} />
            )}
          </ScrollShadow>
        </ModalBody>
      </div>
    </ResponsiveModal>
  );
}
