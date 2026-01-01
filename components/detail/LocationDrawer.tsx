'use client';

import { useEffect, useState, useMemo } from 'react';
import { Location, Shop } from '@/lib/types';
import { getMediaUrl } from '@/lib/utils';
import Image from 'next/image';
import { StarRating } from '@/components/ui/StarRating';
import { CircularCloseButton } from '@/components/ui';

interface LocationDrawerProps {
  location: Location;
  allShops: Shop[];
  onClose: () => void;
  onShopSelect: (shop: Shop) => void;
}

export function LocationDrawer({
  location,
  allShops,
  onClose,
  onShopSelect,
}: LocationDrawerProps) {
  const [storyExpanded, setStoryExpanded] = useState(false);
  const [storyTruncated, setStoryTruncated] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(location);

  // Handle location transitions with animation
  useEffect(() => {
    if (location.documentId !== currentLocation.documentId) {
      // Start fade out
      setIsTransitioning(true);

      // Wait for fade out, then update location and fade in
      const timeout = setTimeout(() => {
        setCurrentLocation(location);
        setStoryExpanded(false);
        setStoryTruncated(false);
        setIsTransitioning(false);
      }, 200);

      return () => clearTimeout(timeout);
    }
  }, [location, currentLocation.documentId]);


  // Get top recommendation shops for this location
  const topRecommendationShops = useMemo(() => {
    return allShops
      .filter((shop) => {
        // Match shops in this location
        const isInLocation =
          shop.location?.documentId === currentLocation.documentId ||
          shop.city_area?.location?.documentId === currentLocation.documentId;

        if (!isInLocation) return false;

        // Check if shop is a top recommendation
        const anyShop = shop as any;
        return (
          anyShop.cityAreaRec === true ||
          anyShop.city_area_rec === true ||
          anyShop.cityarearec === true
        );
      })
      .slice(0, 6);
  }, [allShops, currentLocation.documentId]);

  // Get country info
  const countryCode = currentLocation.country?.code?.toLowerCase();
  // Cascade color priority: location-level → country-level → default
  const primaryColor =
    currentLocation.primaryColor ||
    currentLocation.country?.primaryColor ||
    '#8B6F47';
  const flagUrl = countryCode
    ? `https://hatscripts.github.io/circle-flags/flags/${countryCode}.svg`
    : null;

  // Calculate total shops in location
  const totalShops = allShops.filter(
    (shop) =>
      shop.location?.documentId === currentLocation.documentId ||
      shop.city_area?.location?.documentId === currentLocation.documentId
  ).length;

  const backgroundImage = getMediaUrl(currentLocation.background_image);

  return (
    <div className="drawer">
      <div className="drawer-content">
        {/* Header with background image */}
        <div
          className="relative h-48 location-drawer-header"
          style={{
            backgroundColor: primaryColor,
            backgroundImage: backgroundImage
              ? `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.5)), url(${backgroundImage})`
              : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute top-4 right-4 flex items-center gap-2">
            {flagUrl && (
              <div className="w-10 h-10 rounded-full overflow-hidden bg-white shadow-md">
                <Image
                  src={flagUrl}
                  alt={currentLocation.country?.name || 'Country flag'}
                  width={40}
                  height={40}
                  className="object-cover"
                />
              </div>
            )}
            <CircularCloseButton onPress={onClose} />
          </div>

          <div className="absolute bottom-4 left-4 right-4">
            <div className="text-xs text-white/80 uppercase tracking-wide mb-1">
              City Guide
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">
              {currentLocation.name}
            </h2>
          </div>
        </div>

        {/* Content */}
        <div
          className="p-6 space-y-6 transition-opacity duration-200"
          style={{ opacity: isTransitioning ? 0 : 1 }}
        >
          {/* Highlight cards */}
          <div className="grid grid-cols-2 gap-4">
            {/* City Rating */}
            {currentLocation.rating_stars && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-2">City Rating</div>
                <div className="flex items-center gap-2">
                  <StarRating
                    rating={currentLocation.rating_stars}
                    size={20}
                    animate={!isTransitioning}
                    animationDelay={0}
                  />
                  <span className="ml-1 text-lg font-semibold">
                    {currentLocation.rating_stars.toFixed(1)}
                  </span>
                </div>
              </div>
            )}

            {/* Total Shops */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-2">Total Shops</div>
              <div className="text-2xl font-bold">{totalShops}</div>
            </div>
          </div>

          {/* Story */}
          {currentLocation.story && (
            <div>
              <div className="relative">
                <p
                  className="text-gray-700 leading-relaxed whitespace-pre-line"
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: storyExpanded ? 'unset' : 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: storyExpanded ? 'visible' : 'hidden',
                  }}
                  ref={(el) => {
                    if (el && !storyExpanded && !storyTruncated) {
                      const isTruncated = el.scrollHeight > el.clientHeight;
                      if (isTruncated) setStoryTruncated(true);
                    }
                  }}
                >
                  {currentLocation.story.trim()}
                </p>
                {storyTruncated && !storyExpanded && (
                  <button
                    onClick={() => setStoryExpanded(true)}
                    className="text-accent font-medium text-sm mt-2 hover:underline"
                  >
                    Read more
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Top Choices */}
          {topRecommendationShops.length > 0 && (
            <div>
              <h3 className="text-2xl font-bold mb-5 tracking-tight">Top Choices</h3>
              <div className="grid grid-cols-2 gap-4">
                {topRecommendationShops.map((shop) => {
                  const imageUrl = getMediaUrl(shop.featured_image);
                  const logoUrl = getMediaUrl(shop.brand?.logo);

                  return (
                    <button
                      key={shop.documentId}
                      onClick={() => onShopSelect(shop)}
                      className="group relative overflow-hidden rounded-xl bg-gray-100 aspect-[3/4] hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                    >
                      {imageUrl && (
                        <Image
                          src={imageUrl}
                          alt={shop.name}
                          fill
                          className="object-cover"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4 text-left">
                        {logoUrl && (
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-white mb-3 shadow-md">
                            <Image
                              src={logoUrl}
                              alt={shop.brand?.name || shop.name}
                              width={48}
                              height={48}
                              className="object-cover"
                            />
                          </div>
                        )}
                        <h4 className="font-bold text-white text-base leading-tight line-clamp-2 mb-1">
                          {shop.name}
                        </h4>
                        {shop.city_area?.name && (
                          <p className="text-white/90 text-sm font-medium">
                            {shop.city_area.name}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
