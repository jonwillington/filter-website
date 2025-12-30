'use client';

import { useEffect, useState, useMemo } from 'react';
import { X, Star } from 'lucide-react';
import { Button } from '@heroui/react';
import { Location, Shop } from '@/lib/types';
import { getMediaUrl } from '@/lib/utils';
import Image from 'next/image';

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

  // Reset story state when location changes
  useEffect(() => {
    setStoryExpanded(false);
    setStoryTruncated(false);

    // Debug logging
    console.log('Location data:', {
      name: location.name,
      hasCountry: !!location.country,
      countryObject: location.country, // Full country object
      countryCode: location.country?.code,
      countryPrimaryColor: location.country?.primaryColor,
      locationPrimaryColor: location.primaryColor,
      hasBackgroundImage: !!location.background_image,
      backgroundImageObject: location.background_image, // Full image object
      backgroundImageUrl: location.background_image?.url,
    });
    console.log('Full location object:', location);
  }, [location]);

  // Get top recommendation shops for this location
  const topRecommendationShops = useMemo(() => {
    return allShops
      .filter((shop) => {
        // Match shops in this location
        const isInLocation =
          shop.location?.documentId === location.documentId ||
          shop.city_area?.location?.documentId === location.documentId;

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
  }, [allShops, location.documentId]);

  // Get country info
  const countryCode = location.country?.code?.toLowerCase();
  // Cascade color priority: location-level → country-level → default
  const primaryColor =
    location.primaryColor ||
    location.country?.primaryColor ||
    '#8B6F47';
  const flagUrl = countryCode
    ? `https://hatscripts.github.io/circle-flags/flags/${countryCode}.svg`
    : null;

  // Calculate total shops in location
  const totalShops = allShops.filter(
    (shop) =>
      shop.location?.documentId === location.documentId ||
      shop.city_area?.location?.documentId === location.documentId
  ).length;

  const backgroundImage = getMediaUrl(location.background_image);

  return (
    <div className="drawer">
      <div className="drawer-content">
        {/* Header with background image */}
        <div
          className="relative h-48"
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
                  alt={location.country?.name || 'Country flag'}
                  width={40}
                  height={40}
                  className="object-cover"
                />
              </div>
            )}
            <Button
              isIconOnly
              variant="flat"
              onPress={onClose}
              className="bg-white/90 backdrop-blur-sm"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="absolute bottom-4 left-4 right-4">
            <div className="text-xs text-white/80 uppercase tracking-wide mb-1">
              City Guide
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">
              {location.name}
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Highlight cards */}
          <div className="grid grid-cols-2 gap-4">
            {/* City Rating */}
            {location.rating_stars && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-2">City Rating</div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5"
                      fill={i < (location.rating_stars || 0) ? '#FFB800' : 'none'}
                      stroke={i < (location.rating_stars || 0) ? '#FFB800' : '#D1D5DB'}
                    />
                  ))}
                  <span className="ml-2 text-lg font-semibold">
                    {location.rating_stars.toFixed(1)}
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
          {location.story && (
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
                  {location.story.trim()}
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
              <h3 className="text-xl font-bold mb-4">Top Choices</h3>
              <div className="grid grid-cols-2 gap-4">
                {topRecommendationShops.map((shop) => {
                  const imageUrl = getMediaUrl(shop.featured_image);
                  const logoUrl = getMediaUrl(shop.brand?.logo);

                  return (
                    <button
                      key={shop.documentId}
                      onClick={() => onShopSelect(shop)}
                      className="group relative overflow-hidden rounded-lg bg-gray-100 aspect-[3/4] hover:shadow-lg transition-shadow"
                    >
                      {imageUrl && (
                        <Image
                          src={imageUrl}
                          alt={shop.name}
                          fill
                          className="object-cover"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        {logoUrl && (
                          <div className="w-10 h-10 rounded-md overflow-hidden bg-white mb-2">
                            <Image
                              src={logoUrl}
                              alt={shop.brand?.name || shop.name}
                              width={40}
                              height={40}
                              className="object-cover"
                            />
                          </div>
                        )}
                        <h4 className="font-semibold text-white text-sm line-clamp-2">
                          {shop.name}
                        </h4>
                        {shop.city_area?.name && (
                          <p className="text-white/80 text-xs mt-1">
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
