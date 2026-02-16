import { Shop } from '../types';
import { getShopSlug as generateShopSlug } from '../utils';
import { getCached, setCache } from './cache';

export async function getAllShops(): Promise<Shop[]> {
  const cacheKey = 'shops:all';
  const cached = getCached<Shop[]>(cacheKey);
  if (cached) return cached;

  // D1 is the source of truth
  try {
    const { getAllShopsD1 } = await import('./d1-queries');
    const d1Shops = await getAllShopsD1();
    if (d1Shops && d1Shops.length > 0) {
      setCache(cacheKey, d1Shops);
      return d1Shops;
    }
  } catch {
    // D1 not available (build time, dev without D1)
  }

  // Return empty array if D1 is unavailable (build time)
  return [];
}

export async function getShopsByLocation(locationDocumentId: string): Promise<Shop[]> {
  // Try location-scoped D1 query first (much faster than filtering all shops)
  try {
    const { getShopsByLocationD1 } = await import('./d1-queries');
    const shops = await getShopsByLocationD1(locationDocumentId);
    if (shops) return shops;
  } catch {
    // D1 not available
  }

  // Fallback: filter from all shops
  try {
    const allShops = await getAllShops();
    return allShops.filter((shop) => {
      if (shop.location?.documentId === locationDocumentId) return true;
      const cityArea = shop.city_area ?? shop.cityArea;
      if (cityArea?.location?.documentId === locationDocumentId) return true;
      return false;
    });
  } catch (error) {
    console.error('Failed to fetch shops:', error);
    return [];
  }
}

export async function getShopBySlug(shopSlug: string): Promise<Shop | null> {
  // Try D1 first (fast, direct query)
  try {
    const { getShopBySlugD1 } = await import('./d1-queries');
    const shop = await getShopBySlugD1(shopSlug);
    if (shop) return shop;
  } catch {
    // D1 not available
  }

  // Fallback: search through all shops
  try {
    const allShops = await getAllShops();
    return allShops.find((shop) => generateShopSlug(shop) === shopSlug) ?? null;
  } catch (error) {
    console.error('Failed to fetch shop:', error);
    return null;
  }
}

export async function getShopById(documentId: string): Promise<Shop | null> {
  try {
    const allShops = await getAllShops();
    return allShops.find((shop) => shop.documentId === documentId) ?? null;
  } catch (error) {
    console.error('Failed to fetch shop:', error);
    return null;
  }
}
