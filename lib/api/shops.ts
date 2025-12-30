import { apiClient } from './client';
import { Shop, Country, Location } from '../types';

// Cache for all shops to avoid repeated API calls
let shopsCache: Shop[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cache for countries (fetched separately due to Strapi nested relation limitations)
let countriesCache: Map<string, Country> | null = null;
let countriesCacheTimestamp = 0;

// Cache for locations (fetched via city-areas due to Strapi nested relation limitations)
let locationsCache: Map<string, Partial<Location>> | null = null;
let locationsCacheTimestamp = 0;

// Force cache invalidation on module reload
if (typeof window === 'undefined') {
  shopsCache = null;
  cacheTimestamp = 0;
  countriesCache = null;
  countriesCacheTimestamp = 0;
  locationsCache = null;
  locationsCacheTimestamp = 0;
}

// Populate params to get all related data including nested city_area.location
const SHOP_POPULATE = [
  'populate[brand][populate]=logo',
  'populate[featured_image]=*',
  'populate[gallery]=*',
  'populate[city_area][populate]=location',
  // Populate location with country and background_image
  'populate[location][populate][country]=*',
  'populate[location][populate][background_image]=*',
].join('&');

// Fetch all countries with full data (Strapi limits nested relation fields)
async function getAllCountries(): Promise<Map<string, Country>> {
  const now = Date.now();

  if (countriesCache && now - countriesCacheTimestamp < CACHE_TTL) {
    return countriesCache;
  }

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_STRAPI_URL || 'https://helpful-oasis-8bb949e05d.strapiapp.com/api'}/countries?pagination[pageSize]=100`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_STRAPI_TOKEN}`,
        },
        next: { revalidate: 300 },
      }
    );

    if (!response.ok) {
      throw new Error(`Countries API Error: ${response.statusText}`);
    }

    const json = await response.json();
    const countries = (json.data || []) as Country[];

    // Create lookup map by documentId
    const countryMap = new Map<string, Country>();
    for (const country of countries) {
      if (country.documentId) {
        countryMap.set(country.documentId, country);
      }
    }

    countriesCache = countryMap;
    countriesCacheTimestamp = now;
    return countryMap;
  } catch (error) {
    console.error('Failed to fetch countries:', error);
    return countriesCache ?? new Map();
  }
}

// Fetch locations with full data via city-areas endpoint
// (Strapi nested relations only return minimal fields)
async function getAllLocations(): Promise<Map<string, Partial<Location>>> {
  const now = Date.now();

  if (locationsCache && now - locationsCacheTimestamp < CACHE_TTL) {
    return locationsCache;
  }

  try {
    const allLocations: Partial<Location>[] = [];
    let page = 1;
    let pageCount = 1;

    while (page <= pageCount) {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_URL || 'https://helpful-oasis-8bb949e05d.strapiapp.com/api'}/city-areas?populate[location]=*&pagination[pageSize]=100&pagination[page]=${page}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_STRAPI_TOKEN}`,
          },
          next: { revalidate: 300 },
        }
      );

      if (!response.ok) {
        throw new Error(`City Areas API Error: ${response.statusText}`);
      }

      const json = await response.json();
      const cityAreas = json.data || [];

      for (const cityArea of cityAreas) {
        if (cityArea.location?.documentId) {
          allLocations.push(cityArea.location);
        }
      }

      pageCount = json.meta?.pagination?.pageCount || 1;
      page++;
    }

    // Create lookup map by documentId (deduplicating)
    const locationMap = new Map<string, Partial<Location>>();
    for (const location of allLocations) {
      if (location.documentId) {
        locationMap.set(location.documentId, location);
      }
    }

    locationsCache = locationMap;
    locationsCacheTimestamp = now;
    return locationMap;
  } catch (error) {
    console.error('Failed to fetch locations:', error);
    return locationsCache ?? new Map();
  }
}

// Merge full country and location data into shop
function enrichShopData(
  shop: Shop,
  countryMap: Map<string, Country>,
  locationMap: Map<string, Partial<Location>>
): Shop {
  // Enrich direct location
  if (shop.location?.documentId) {
    const fullLocation = locationMap.get(shop.location.documentId);
    if (fullLocation) {
      // Merge full location data (preserving country from nested populate)
      shop.location = {
        ...fullLocation,
        ...shop.location,
        // Override with full location fields
        story: fullLocation.story ?? shop.location.story,
        headline: fullLocation.headline ?? shop.location.headline,
        rating_stars: fullLocation.rating_stars ?? shop.location.rating_stars,
        inFocus: fullLocation.inFocus ?? shop.location.inFocus,
      } as Location;
    }

    // Enrich country data
    if (shop.location.country?.documentId) {
      const fullCountry = countryMap.get(shop.location.country.documentId);
      if (fullCountry) {
        shop.location.country = fullCountry;
      }
    }
  }

  // Enrich city_area's location
  const cityArea = shop.city_area ?? shop.cityArea;
  if (cityArea?.location?.documentId) {
    const fullLocation = locationMap.get(cityArea.location.documentId);
    const existingLoc = cityArea.location as Location;
    if (fullLocation) {
      cityArea.location = {
        ...fullLocation,
        ...existingLoc,
        story: fullLocation.story ?? existingLoc.story,
        headline: fullLocation.headline ?? existingLoc.headline,
        rating_stars: fullLocation.rating_stars ?? existingLoc.rating_stars,
        inFocus: fullLocation.inFocus ?? existingLoc.inFocus,
      } as Location;
    }

    // Enrich country data
    const enrichedLoc = cityArea.location as Location;
    if (enrichedLoc.country?.documentId) {
      const fullCountry = countryMap.get(enrichedLoc.country.documentId);
      if (fullCountry) {
        enrichedLoc.country = fullCountry;
      }
    }
  }

  return shop;
}

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

    // Fetch countries and locations to enrich shop data
    // (Strapi nested relations only return minimal fields)
    const [countryMap, locationMap] = await Promise.all([
      getAllCountries(),
      getAllLocations(),
    ]);

    for (const shop of allShops) {
      enrichShopData(shop, countryMap, locationMap);
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
