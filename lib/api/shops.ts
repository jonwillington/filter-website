import { apiClient } from './client';
import { Shop } from '../types';

// Cache for all shops to avoid repeated API calls
let shopsCache: Shop[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Populate params to get all related data including nested city_area.location
const SHOP_POPULATE = [
  'populate[brand][populate]=logo',
  'populate[location]=*',
  'populate[city_area][populate]=location',
  'populate[featured_image]=*',
  'populate[gallery]=*',
].join('&');

export async function getAllShops(): Promise<Shop[]> {
  const now = Date.now();

  // Return cached data if valid
  if (shopsCache && now - cacheTimestamp < CACHE_TTL) {
    return shopsCache;
  }

  try {
    const allShops: Shop[] = [];
    let page = 1;
    let pageCount = 1;

    // Fetch all pages (Strapi limits to 100 per page max)
    while (page <= pageCount) {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_URL || 'https://helpful-oasis-8bb949e05d.strapiapp.com/api'}/shops?${SHOP_POPULATE}&pagination[pageSize]=100&pagination[page]=${page}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_STRAPI_TOKEN}`,
          },
          next: { revalidate: 300 },
        }
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      const json = await response.json();
      const data = json.data || [];
      allShops.push(...data);

      pageCount = json.meta?.pagination?.pageCount || 1;
      page++;
    }

    shopsCache = allShops;
    cacheTimestamp = now;
    return shopsCache;
  } catch (error) {
    console.error('Failed to fetch all shops:', error);
    return shopsCache ?? [];
  }
}

export async function getShopsByLocation(locationDocumentId: string): Promise<Shop[]> {
  try {
    const allShops = await getAllShops();
    return allShops.filter((shop) => {
      // Direct location match
      if (shop.location?.documentId === locationDocumentId) {
        return true;
      }
      // Match via city_area's location (for shops linked through neighborhoods)
      const cityArea = shop.city_area ?? shop.cityArea;
      if (cityArea?.location?.documentId === locationDocumentId) {
        return true;
      }
      return false;
    });
  } catch (error) {
    console.error('Failed to fetch shops:', error);
    return [];
  }
}

export async function getShopBySlug(shopSlug: string): Promise<Shop | null> {
  try {
    const allShops = await getAllShops();
    // First try exact slug match
    const exactMatch = allShops.find((shop) => shop.slug === shopSlug);
    if (exactMatch) return exactMatch;

    // Fallback: match against slugified name
    const slugify = (text: string) =>
      text
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');

    return allShops.find((shop) => slugify(shop.name) === shopSlug) ?? null;
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
