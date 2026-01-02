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
  useWrapper?: boolean;
}

export function LocationDrawer({
  location,
  allShops,
  onClose,
  onShopSelect,
  useWrapper = true,
}: LocationDrawerProps) {
  const [storyExpanded, setStoryExpanded] = useState(false);
  const [storyTruncated, setStoryTruncated] = useState(false);

  // Reset story state when location changes
  useEffect(() => {
    setStoryExpanded(false);
    setStoryTruncated(false);
  }, [location.documentId]);

  // Use location directly - no internal state needed
  const currentLocation = location;


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

  const content = (
    <>
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
        <div className="p-6 space-y-6">
          {/* Beta Banner */}
          {currentLocation.beta && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-blue-900 mb-1">
                  This location is in beta
                </h4>
                <p className="text-sm text-blue-800">
                  More shops are currently being added
                </p>
              </div>
            </div>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-6 text-sm">
            {/* City Rating */}
            {currentLocation.rating_stars && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Rating</span>
                <StarRating
                  rating={currentLocation.rating_stars}
                  size={14}
                  animate={true}
                  animationDelay={0}
                />
                <span className="font-medium">{currentLocation.rating_stars.toFixed(1)}</span>
              </div>
            )}

            {/* Total Shops */}
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Shops</span>
              <span className="font-medium">{totalShops}</span>
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
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Top Choices</h3>
              <div className="grid grid-cols-2 gap-3">
                {topRecommendationShops.map((shop, index) => {
                  const imageUrl = getMediaUrl(shop.featured_image);
                  const logoUrl = getMediaUrl(shop.brand?.logo);

                  return (
                    <button
                      key={shop.documentId}
                      onClick={() => onShopSelect(shop)}
                      className="group relative overflow-hidden bg-gray-100 aspect-[4/3] hover:brightness-110 transition-all duration-300 rounded-xl border border-gray-200"
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
                      <div className="absolute bottom-0 left-0 right-0 p-3 text-left">
                        {logoUrl && (
                          <div className="w-7 h-7 rounded-md overflow-hidden bg-white mb-2 shadow-sm">
                            <Image
                              src={logoUrl}
                              alt={shop.brand?.name || shop.name}
                              width={28}
                              height={28}
                              className="object-cover"
                            />
                          </div>
                        )}
                        <h4 className="font-bold text-white text-sm leading-tight line-clamp-2">
                          {shop.name}
                        </h4>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );

  if (useWrapper) {
    return <div className="drawer">{content}</div>;
  }

  return content;
}
