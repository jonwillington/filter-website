import { Shop } from '../types';

/**
 * Calculate distance between two coordinates using Haversine formula.
 * @returns Distance in kilometers
 */
export function calculateDistance(point1: [number, number], point2: [number, number]): number {
  const [lng1, lat1] = point1;
  const [lng2, lat2] = point2;

  const toRad = (deg: number) => deg * Math.PI / 180;
  const R = 6371; // Earth's radius in km

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Get coordinates from a shop, handling both coordinate formats.
 */
export function getShopCoords(shop: Shop): [number, number] | null {
  if (shop.coordinates?.lng && shop.coordinates?.lat) {
    return [shop.coordinates.lng, shop.coordinates.lat];
  }
  if (shop.longitude && shop.latitude) {
    return [shop.longitude, shop.latitude];
  }
  return null;
}

/**
 * Get local density for a shop.
 * Uses pre-calculated value if available (from server), otherwise calculates on demand.
 * @param shop - The shop to get density for
 * @param allShops - All shops (only used if pre-calculated value not available)
 * @param radiusKm - Radius in kilometers (default: 1.5km)
 * @returns Number of nearby shops
 */
export function calculateLocalDensity(
  shop: Shop,
  allShops?: Shop[],
  radiusKm: number = 1.5
): number {
  // Use pre-calculated density if available (much faster)
  if (typeof shop.localDensity === 'number') {
    return shop.localDensity;
  }

  // Fallback to on-demand calculation (O(n) per shop)
  if (!allShops) return 0;

  const coords = getShopCoords(shop);
  if (!coords) return 0;

  let nearbyCount = 0;
  for (const otherShop of allShops) {
    if (otherShop.documentId === shop.documentId) continue;

    const otherCoords = getShopCoords(otherShop);
    if (!otherCoords) continue;

    const distance = calculateDistance(coords, otherCoords);
    if (distance <= radiusKm) {
      nearbyCount++;
    }
  }

  return nearbyCount;
}

/**
 * Calculate the center point for a collection of shops.
 */
export function calculateShopsCenter(shops: Shop[]): [number, number] | null {
  const validShops = shops.filter(s => getShopCoords(s));
  if (validShops.length === 0) return null;

  const avgLng = validShops.reduce((sum, s) => sum + (getShopCoords(s)?.[0] ?? 0), 0) / validShops.length;
  const avgLat = validShops.reduce((sum, s) => sum + (getShopCoords(s)?.[1] ?? 0), 0) / validShops.length;

  return [avgLng, avgLat];
}

/**
 * Determine zoom bracket based on zoom level.
 * Used for marker size calculations.
 */
export function getZoomBracket(zoom: number): number {
  const thresholds = [3, 5, 7, 10, 13, 15, 17];
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (zoom >= thresholds[i]) return i + 1;
  }
  return 0;
}
