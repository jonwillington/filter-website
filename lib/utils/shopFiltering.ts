import { Shop, Location } from '../types';
import { hasCityAreaRecommendation } from '../utils';

/**
 * Filter shops belonging to a specific location.
 */
export function filterShopsByLocation(shops: Shop[], location: Location | null): Shop[] {
  if (!location) return shops;
  return shops.filter((shop) =>
    shop.location?.documentId === location.documentId ||
    shop.city_area?.location?.documentId === location.documentId
  );
}

/**
 * Get shops from the same brand as the given shop (across all locations).
 */
export function getMoreFromBrand(
  shop: Shop,
  allShops: Shop[],
  limit: number = 10
): Shop[] {
  if (!shop.brand?.documentId) return [];

  const currentLocationId = shop.location?.documentId;

  return allShops
    .filter(
      (s) =>
        s.documentId !== shop.documentId &&
        s.brand?.documentId === shop.brand?.documentId
    )
    // Sort: same location first, then other locations
    .sort((a, b) => {
      const aInLocation = a.location?.documentId === currentLocationId;
      const bInLocation = b.location?.documentId === currentLocationId;
      if (aInLocation && !bInLocation) return -1;
      if (!aInLocation && bInLocation) return 1;
      return 0;
    })
    .slice(0, limit);
}

/**
 * Get nearby shops from the same city area, excluding specific shops.
 */
export function getNearbyShops(
  shop: Shop,
  allShops: Shop[],
  excludeIds: string[] = [],
  limit: number = 5
): Shop[] {
  const areaId = shop.city_area?.documentId ?? shop.cityArea?.documentId;
  if (!areaId) return [];

  return allShops
    .filter(
      (s) =>
        s.documentId !== shop.documentId &&
        (s.city_area?.documentId === areaId || s.cityArea?.documentId === areaId) &&
        !excludeIds.includes(s.documentId)
    )
    .slice(0, limit);
}

/**
 * Filter shops to only top recommendations.
 */
export function filterTopRecommendations(shops: Shop[]): Shop[] {
  return shops.filter((shop) => hasCityAreaRecommendation(shop));
}

/**
 * Get top recommendation shops for a location.
 */
export function getTopRecommendationsForLocation(
  allShops: Shop[],
  locationId: string,
  limit: number = 6
): Shop[] {
  return allShops
    .filter((shop) => {
      const isInLocation =
        shop.location?.documentId === locationId ||
        shop.city_area?.location?.documentId === locationId;

      if (!isInLocation) return false;
      return hasCityAreaRecommendation(shop);
    })
    .slice(0, limit);
}
