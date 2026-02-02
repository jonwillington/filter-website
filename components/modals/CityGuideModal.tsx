'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Location, Shop, Event, Critic } from '@/lib/types';
import { ResponsiveModal, CircularCloseButton } from '@/components/ui';
import { StarRating } from '@/components/ui/StarRating';
import { getMediaUrl, getShopDisplayName } from '@/lib/utils';

const getFlagUrl = (countryCode: string): string =>
  `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;
import { getTopRecommendationsForLocation, filterShopsByLocation } from '@/lib/utils/shopFiltering';
import { EventCard, EventModal } from '@/components/events';
import { CriticCard, CriticModal } from '@/components/critics';
import { FilterRecommendationsModal } from '@/components/modals/FilterRecommendationsModal';

interface CityGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: Location | null;
  allShops: Shop[];
  events?: Event[];
  critics?: Critic[];
  onShopSelect: (shop: Shop) => void;
  allLocations?: Location[];
  onLocationChange?: (location: Location) => void;
}

export function CityGuideModal({
  isOpen,
  onClose,
  location,
  allShops,
  events = [],
  critics = [],
  onShopSelect,
}: CityGuideModalProps) {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedCritic, setSelectedCritic] = useState<Critic | null>(null);
  const [showRecommendationsModal, setShowRecommendationsModal] = useState(false);

  // Computed values
  const backgroundImage = useMemo(() => location ? getMediaUrl(location.background_image) : null, [location]);

  const primaryColor = useMemo(() =>
    location?.primaryColor || location?.country?.primaryColor || '#8B6F47',
    [location]
  );

  const topRecommendationShops = useMemo(
    () => location ? getTopRecommendationsForLocation(allShops, location.documentId, 6) : [],
    [allShops, location]
  );

  const totalShops = useMemo(
    () => location ? filterShopsByLocation(allShops, location).length : 0,
    [allShops, location]
  );

  const locationEvents = useMemo(() => {
    if (!location) return [];
    const now = new Date();
    return events
      .filter((event) => event.city?.documentId === location.documentId && new Date(event.start_date) >= now)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  }, [events, location]);

  const locationCritics = useMemo(() => {
    if (!location) return [];
    return critics.filter((critic) =>
      critic.locations?.some((loc) => loc.documentId === location.documentId)
    );
  }, [critics, location]);

  const placeholderStory = useMemo(() => {
    if (!location) return '';
    return totalShops > 0
      ? `Discover the best specialty coffee in ${location.name}. Our curated selection features ${totalShops} carefully chosen cafés, from hidden neighbourhood gems to celebrated roasters.`
      : `We're exploring the specialty coffee scene in ${location.name}. Check back soon for recommendations.`;
  }, [location, totalShops]);

  if (!location) return null;

  const displayStory = location.story?.trim() || placeholderStory;

  // Handle shop selection - close modal and select shop
  const handleShopSelect = (shop: Shop) => {
    onClose();
    onShopSelect(shop);
  };

  return (
    <>
      <ResponsiveModal
        isOpen={isOpen}
        onClose={onClose}
        size="5xl"
        hideCloseButton
        modalClassNames={{
          wrapper: 'z-[1100]',
          backdrop: 'z-[1100]',
          base: '!bg-[var(--surface-warm)] !max-w-[1400px]',
        }}
      >
        {/* Close button */}
        <div className="absolute top-4 right-4 z-10">
          <CircularCloseButton onPress={onClose} size="sm" />
        </div>

        {/* Three-column layout on desktop */}
        <div className="lg:grid lg:grid-cols-[1.2fr_1.5fr_1fr] gap-10 p-6">
            {/* Left column - Details and image */}
            <div className="flex flex-col h-full lg:border-r lg:border-black/5 lg:pr-6">
              {/* City name */}
              <h2 className="text-4xl lg:text-5xl font-medium text-primary leading-tight">
                {location.name}
              </h2>

              {/* Country with flag */}
              {location.country?.name && (
                <div className="flex items-center gap-1.5 mt-1">
                  {location.country?.code && (
                    <span className="w-3.5 h-3.5 rounded-full overflow-hidden flex-shrink-0 border border-border-default">
                      <Image
                        src={getFlagUrl(location.country.code)}
                        alt={location.country.name || ''}
                        width={14}
                        height={14}
                        className="object-cover w-full h-full"
                        unoptimized
                      />
                    </span>
                  )}
                  <p className="text-sm text-text-secondary">
                    {location.country.name}
                  </p>
                </div>
              )}

              {/* Stats row */}
              <div className="flex items-center gap-4 text-sm mt-3">
                {location.rating_stars && (
                  <div className="flex items-center gap-1.5">
                    <StarRating rating={location.rating_stars} size={12} />
                    <span className="text-text-secondary">{location.rating_stars.toFixed(1)}</span>
                  </div>
                )}
                <span className="text-text-secondary">{totalShops} shops</span>
              </div>

              {/* Map and Image - pinned to bottom */}
              <div className="mt-auto pt-6 border-t border-black/5 space-y-3">
                {/* Static map showing location */}
                {location.coordinates && (
                  <div className="rounded-xl overflow-hidden border border-border-default">
                    <iframe
                      src={`https://maps.google.com/maps?q=${Array.isArray(location.coordinates) ? `${location.coordinates[0]?.lat},${location.coordinates[0]?.lng}` : `${location.coordinates.lat},${location.coordinates.lng}`}&z=4&output=embed`}
                      width="100%"
                      height="120"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title={`Map showing ${location.name}`}
                    />
                  </div>
                )}

                {/* City image */}
                {backgroundImage && (
                  <div className="relative w-full h-40 rounded-xl overflow-hidden">
                    <Image
                      src={backgroundImage}
                      alt={location.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Middle column - Story and events/critics */}
            <div className="mt-8 lg:mt-0 space-y-8 lg:border-r lg:border-black/5 lg:pr-6">
              {/* Story */}
              <div>
                <h3 className="text-xs font-medium text-primary opacity-60 uppercase tracking-wider mb-4">About</h3>
                <div className="space-y-3 text-sm text-text-secondary leading-relaxed">
                  <p>
                    Filter is your guide to the best specialty coffee around the world. We personally visit and evaluate every café on our platform, ensuring you'll always find exceptional coffee wherever you travel. Our team of coffee enthusiasts spans the globe, constantly seeking out new and noteworthy spots.
                  </p>
                  <p>
                    Our recommendations are based on quality of coffee, atmosphere, and the overall experience. We look for cafés that source their beans responsibly, employ skilled baristas, and create welcoming spaces for their communities. We pay attention to the details that matter: the freshness of the roast, the precision of extraction, and the care put into every cup.
                  </p>
                  <p>
                    Whether you're looking for a quiet workspace with reliable WiFi, a beautiful interior perfect for capturing memories, or simply the best espresso in town, Filter helps you discover cafés that meet your standards. Every recommendation has been personally verified by our team.
                  </p>
                  <p>
                    We believe great coffee is about more than just the drink itself. It's about the people who grow it, roast it, and serve it. It's about the spaces where communities gather and connections are made. Filter celebrates all of these elements, helping you find not just good coffee, but meaningful experiences.
                  </p>
                </div>
              </div>

              {/* Events */}
              {locationEvents.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-primary opacity-60 uppercase tracking-wider mb-4">
                    {locationEvents.length} Upcoming {locationEvents.length === 1 ? 'Event' : 'Events'}
                  </h3>
                  <div className="space-y-3">
                    {locationEvents.slice(0, 3).map((event) => (
                      <EventCard
                        key={event.documentId}
                        event={event}
                        onClick={() => setSelectedEvent(event)}
                        primaryColor={primaryColor}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Insiders Guide */}
              {locationCritics.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-primary opacity-60 uppercase tracking-wider mb-4">
                    Insiders Guide
                  </h3>
                  <div className="space-y-3">
                    {locationCritics.map((critic) => (
                      <CriticCard key={critic.documentId} critic={critic} onClick={() => setSelectedCritic(critic)} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right column - Recommendations */}
            <div className="mt-8 lg:mt-0">
              {topRecommendationShops.length > 0 ? (
                <div>
                  <h3 className="text-xs font-medium text-primary opacity-60 uppercase tracking-wider mb-4">
                    {topRecommendationShops.length} Filter {topRecommendationShops.length === 1 ? 'Recommendation' : 'Recommendations'}
                  </h3>
                  <div className="space-y-2">
                    {topRecommendationShops.map((shop) => {
                      const imageUrl = getMediaUrl(shop.featured_image);
                      const logoUrl = getMediaUrl(shop.brand?.logo);
                      const neighborhoodName = shop.city_area?.name;
                      const displayName = getShopDisplayName(shop);
                      const getShortAddress = (address: string) => address.split(',').map(p => p.trim())[0];
                      const locationLabel = neighborhoodName || (shop.address ? getShortAddress(shop.address) : null);

                      return (
                        <button
                          key={shop.documentId}
                          onClick={() => handleShopSelect(shop)}
                          className="w-full text-left py-3 group"
                        >
                          <div className="flex items-center gap-3">
                            {shop.brand && (
                              logoUrl ? (
                                <div className="w-11 h-11 rounded-full overflow-hidden bg-border-default flex-shrink-0">
                                  <Image src={logoUrl} alt={shop.brand.name} width={44} height={44} className="object-cover w-full h-full" />
                                </div>
                              ) : (
                                <div className="w-11 h-11 rounded-full flex items-center justify-center text-base bg-border-default text-primary flex-shrink-0">
                                  {shop.brand.name.charAt(0)}
                                </div>
                              )
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-base text-primary leading-tight line-clamp-1 group-hover:text-amber-900 dark:group-hover:text-amber-700 transition-colors">{displayName}</h4>
                              {locationLabel && <p className="text-sm text-text-secondary line-clamp-1 mt-0.5">{locationLabel}</p>}
                            </div>
                            <div className="relative w-24 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-white/5">
                              {imageUrl ? (
                                <Image src={imageUrl} alt={displayName} fill className="object-cover" />
                              ) : null}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-text-secondary leading-tight mt-3">
                    Filter recommendations are places we have verified for outstanding coffee.{' '}
                    <button
                      onClick={() => setShowRecommendationsModal(true)}
                      className="text-primary hover:text-accent transition-colors"
                    >
                      Learn more
                    </button>
                  </p>
                </div>
              ) : (
                <div className="bg-white/50 dark:bg-white/5 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-primary mb-2">No recommendations yet</h4>
                  <p className="text-xs text-text-secondary">
                    We haven&apos;t found any verified specialty coffee shops in {location.name} yet.
                  </p>
                </div>
              )}
            </div>
        </div>
      </ResponsiveModal>

      {/* Nested modals */}
      <EventModal
        event={selectedEvent}
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        primaryColor={primaryColor}
      />
      <FilterRecommendationsModal
        isOpen={showRecommendationsModal}
        onClose={() => setShowRecommendationsModal(false)}
      />
      <CriticModal
        critic={selectedCritic}
        isOpen={!!selectedCritic}
        onClose={() => setSelectedCritic(null)}
        onShopSelect={handleShopSelect}
      />
    </>
  );
}
