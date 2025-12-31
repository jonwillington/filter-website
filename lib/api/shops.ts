import { Shop, Country, Location } from '../types';
import { getShopSlug as generateShopSlug } from '../utils';

// Cache for all shops to avoid repeated API calls
let shopsCache: Shop[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes - shops data doesn't change frequently

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
  // Explicitly populate all brand fields (Strapi v5 doesn't fully support populate=* for nested relations)
  'populate[brand][fields][0]=name',
  'populate[brand][fields][1]=type',
  'populate[brand][fields][2]=description',
  'populate[brand][fields][3]=story',
  'populate[brand][fields][4]=website',
  'populate[brand][fields][5]=phone',
  'populate[brand][fields][6]=instagram',
  'populate[brand][fields][7]=facebook',
  'populate[brand][fields][8]=tiktok',
  'populate[brand][fields][9]=has_wifi',
  'populate[brand][fields][10]=has_food',
  'populate[brand][fields][11]=has_outdoor_space',
  'populate[brand][fields][12]=is_pet_friendly',
  'populate[brand][fields][13]=has_espresso',
  'populate[brand][fields][14]=has_filter_coffee',
  'populate[brand][fields][15]=has_v60',
  'populate[brand][fields][16]=has_chemex',
  'populate[brand][fields][17]=has_aeropress',
  'populate[brand][fields][18]=has_french_press',
  'populate[brand][fields][19]=has_cold_brew',
  'populate[brand][fields][20]=has_batch_brew',
  'populate[brand][fields][21]=roastOwnBeans',
  'populate[brand][fields][22]=ownRoastDesc',
  // Populate brand relations
  'populate[brand][populate][logo]=*',
  'populate[brand][populate][suppliers][populate][logo]=*',
  'populate[brand][populate][suppliers][populate][country]=*',
  'populate[brand][populate][coffee_partner][populate][logo]=*',
  'populate[brand][populate][ownRoastCountry]=*',
  // Other shop fields
  'populate[featured_image]=*',
  'populate[gallery]=*',
  // Populate city_area with full location data
  // Use populate[location]=* to get base fields, then explicitly populate relations
  'populate[city_area][populate][location]=*',
  'populate[city_area][populate][location][populate][country]=*',
  'populate[city_area][populate][location][populate][background_image]=*',
  // Populate direct location with full data
  'populate[location]=*',
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
        `${process.env.NEXT_PUBLIC_STRAPI_URL || 'https://helpful-oasis-8bb949e05d.strapiapp.com/api'}/city-areas?populate[location]=*&populate[location][populate][country]=*&populate[location][populate][background_image]=*&pagination[pageSize]=100&pagination[page]=${page}`,
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

// Merge full country data into shop (skip slow location enrichment)
function enrichShopData(
  shop: Shop,
  countryMap: Map<string, Country>
): Shop {
  // Enrich direct location's country data
  if (shop.location?.country?.documentId) {
    const fullCountry = countryMap.get(shop.location.country.documentId);
    if (fullCountry) {
      shop.location.country = fullCountry;
    }
  }

  // Enrich city_area's location's country data
  const cityArea = shop.city_area ?? shop.cityArea;
  const enrichedLoc = cityArea?.location as Location | undefined;
  if (enrichedLoc?.country?.documentId) {
    const fullCountry = countryMap.get(enrichedLoc.country.documentId);
    if (fullCountry) {
      enrichedLoc.country = fullCountry;
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

    // Fetch countries to enrich shop data
    // (Strapi nested relations only return minimal country fields)
    // Location data is already fully populated from shops endpoint
    const countryMap = await getAllCountries();

    for (const shop of allShops) {
      enrichShopData(shop, countryMap);
    }

    // Brand data is already fully populated via SHOP_POPULATE with explicit field requests
    // No need for individual brand fetches - this was causing N+1 API calls

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
    // Match using the same slug generation logic as getShopSlug
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
