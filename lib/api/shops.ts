import { Shop, Country, Location } from '../types';
import { getShopSlug as generateShopSlug } from '../utils';
import { getCached, setCache, getPrefetched } from './cache';
import { getAllBrands, Brand } from './brands';

/**
 * Calculate distance between two coordinates using Haversine formula.
 * @returns Distance in kilometers
 */
function calculateDistance(point1: [number, number], point2: [number, number]): number {
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
 * Get coordinates from a shop for density calculation.
 */
function getShopCoordsForDensity(shop: Shop): [number, number] | null {
  if (shop.coordinates?.lng && shop.coordinates?.lat) {
    return [shop.coordinates.lng, shop.coordinates.lat];
  }
  if (shop.longitude && shop.latitude) {
    return [shop.longitude, shop.latitude];
  }
  return null;
}

/**
 * Pre-calculate local density for all shops.
 * This is O(n²) but runs once on the server, not on every client render.
 */
function calculateAllDensities(shops: Shop[], radiusKm: number = 1.5): Map<string, number> {
  const densities = new Map<string, number>();

  // Build coordinate lookup for efficiency
  const coordsMap = new Map<string, [number, number]>();
  for (const shop of shops) {
    const coords = getShopCoordsForDensity(shop);
    if (coords) {
      coordsMap.set(shop.documentId, coords);
    }
  }

  // Calculate density for each shop
  for (const shop of shops) {
    const coords = coordsMap.get(shop.documentId);
    if (!coords) {
      densities.set(shop.documentId, 0);
      continue;
    }

    let nearbyCount = 0;
    // Iterate through all shops to find nearby ones
    for (const otherShop of shops) {
      if (otherShop.documentId === shop.documentId) continue;

      const otherCoords = coordsMap.get(otherShop.documentId);
      if (!otherCoords) continue;

      const distance = calculateDistance(coords, otherCoords);
      if (distance <= radiusKm) {
        nearbyCount++;
      }
    }

    densities.set(shop.documentId, nearbyCount);
  }

  return densities;
}

// Populate params to get all related data including nested city_area.location
// Note: Strapi v5 has issues with explicit brand[fields] combined with brand[populate]
// so we simplify brand populate and merge full brand data via getAllBrands() later
const SHOP_POPULATE = [
  // Brand - simple populate, full data comes from getAllBrands() enrichment
  'populate[brand][populate][logo][fields][0]=url',
  'populate[brand][populate][logo][fields][1]=formats',
  // Shop's own coffee_partner (can override brand's)
  'populate[coffee_partner][populate][0]=logo',
  'populate[coffee_partner][populate][1]=bg-image',
  'populate[coffee_partner][populate][2]=country',
  // Shop images
  'populate[featured_image]=*',
  'populate[gallery]=*',
  // Populate city_area with all its fields (including JSON field boundary_coordinates)
  // Then add nested populates for its relations
  'populate[city_area]=*',
  'populate[city_area][populate][location]=*',
  'populate[city_area][populate][location][populate][country]=*',
  'populate[city_area][populate][location][populate][background_image]=*',
  // Populate direct location with full data
  'populate[location][populate][country]=*',
  'populate[location][populate][background_image]=*',
].join('&');

// Fetch all countries with full data (Strapi limits nested relation fields)
async function getAllCountries(): Promise<Map<string, Country>> {
  const cacheKey = 'countries:all';
  const cached = getCached<Map<string, Country>>(cacheKey);
  if (cached) return cached;

  // Check for pre-fetched data
  const prefetched = await getPrefetched<Country[]>('countries');
  if (prefetched) {
    const countryMap = new Map<string, Country>();
    for (const country of prefetched) {
      if (country.documentId) {
        countryMap.set(country.documentId, country);
      }
    }
    setCache(cacheKey, countryMap);
    return countryMap;
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

    setCache(cacheKey, countryMap);
    return countryMap;
  } catch (error) {
    console.error('Failed to fetch countries:', error);
    return new Map();
  }
}

// Fetch all city areas with group field
// (Strapi doesn't return group field when populating through shops relation)
async function getAllCityAreasMap(): Promise<Map<string, { group: string | null }>> {
  const cacheKey = 'cityareas:map';
  const cached = getCached<Map<string, { group: string | null }>>(cacheKey);
  if (cached) return cached;

  // Check for pre-fetched data
  const prefetched = await getPrefetched<Array<{ documentId: string; group?: string | null }>>('city-areas');
  if (prefetched) {
    const cityAreaMap = new Map<string, { group: string | null }>();
    for (const cityArea of prefetched) {
      if (cityArea.documentId) {
        cityAreaMap.set(cityArea.documentId, { group: cityArea.group || null });
      }
    }
    setCache(cacheKey, cityAreaMap);
    return cityAreaMap;
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://helpful-oasis-8bb949e05d.strapiapp.com/api';
    const fetchOptions = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_STRAPI_TOKEN}`,
      },
      next: { revalidate: 300 },
    };

    // Fetch first page to get total page count
    const firstResponse = await fetch(
      `${baseUrl}/city-areas?fields[0]=documentId&fields[1]=group&pagination[pageSize]=100&pagination[page]=1`,
      fetchOptions
    );

    if (!firstResponse.ok) {
      throw new Error(`City Areas API Error: ${firstResponse.statusText}`);
    }

    const firstJson = await firstResponse.json();
    const pageCount = firstJson.meta?.pagination?.pageCount || 1;
    const cityAreaMap = new Map<string, { group: string | null }>();

    for (const cityArea of (firstJson.data || [])) {
      if (cityArea.documentId) {
        cityAreaMap.set(cityArea.documentId, { group: cityArea.group || null });
      }
    }

    // Fetch remaining pages in parallel
    if (pageCount > 1) {
      const pagePromises = [];
      for (let page = 2; page <= pageCount; page++) {
        pagePromises.push(
          fetch(
            `${baseUrl}/city-areas?fields[0]=documentId&fields[1]=group&pagination[pageSize]=100&pagination[page]=${page}`,
            fetchOptions
          ).then(res => res.ok ? res.json() : Promise.reject(new Error(`Page ${page} failed`)))
        );
      }

      const results = await Promise.all(pagePromises);
      for (const json of results) {
        for (const cityArea of (json.data || [])) {
          if (cityArea.documentId) {
            cityAreaMap.set(cityArea.documentId, { group: cityArea.group || null });
          }
        }
      }
    }

    setCache(cacheKey, cityAreaMap);
    return cityAreaMap;
  } catch (error) {
    console.error('Failed to fetch city areas:', error);
    return new Map();
  }
}

// Fetch locations with full data via city-areas endpoint
// (Strapi nested relations only return minimal fields)
async function getAllLocationsMap(): Promise<Map<string, Partial<Location>>> {
  const cacheKey = 'locations:map';
  const cached = getCached<Map<string, Partial<Location>>>(cacheKey);
  if (cached) return cached;

  try {
    const baseUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://helpful-oasis-8bb949e05d.strapiapp.com/api';
    const fetchOptions = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_STRAPI_TOKEN}`,
      },
      next: { revalidate: 300 },
    };

    // Fetch first page to get total page count
    const firstResponse = await fetch(
      `${baseUrl}/city-areas?populate[location]=*&populate[location][populate][country]=*&populate[location][populate][background_image]=*&pagination[pageSize]=100&pagination[page]=1`,
      fetchOptions
    );

    if (!firstResponse.ok) {
      throw new Error(`City Areas API Error: ${firstResponse.statusText}`);
    }

    const firstJson = await firstResponse.json();
    const pageCount = firstJson.meta?.pagination?.pageCount || 1;
    const allLocations: Partial<Location>[] = [];

    for (const cityArea of (firstJson.data || [])) {
      if (cityArea.location?.documentId) {
        allLocations.push(cityArea.location);
      }
    }

    // Fetch remaining pages in parallel
    if (pageCount > 1) {
      const pagePromises = [];
      for (let page = 2; page <= pageCount; page++) {
        pagePromises.push(
          fetch(
            `${baseUrl}/city-areas?populate[location]=*&populate[location][populate][country]=*&populate[location][populate][background_image]=*&pagination[pageSize]=100&pagination[page]=${page}`,
            fetchOptions
          ).then(res => res.ok ? res.json() : Promise.reject(new Error(`Page ${page} failed`)))
        );
      }

      const results = await Promise.all(pagePromises);
      for (const json of results) {
        for (const cityArea of (json.data || [])) {
          if (cityArea.location?.documentId) {
            allLocations.push(cityArea.location);
          }
        }
      }
    }

    // Create lookup map by documentId (deduplicating)
    const locationMap = new Map<string, Partial<Location>>();
    for (const location of allLocations) {
      if (location.documentId) {
        locationMap.set(location.documentId, location);
      }
    }

    setCache(cacheKey, locationMap);
    return locationMap;
  } catch (error) {
    console.error('Failed to fetch locations:', error);
    return new Map();
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
  const cacheKey = 'shops:all';
  const cached = getCached<Shop[]>(cacheKey);
  if (cached) return cached;

  // Check for pre-fetched data (from build-time prefetch script)
  const prefetched = await getPrefetched<Shop[]>('shops');
  if (prefetched) {
    // Still need to enrich with country, brand, and city area data
    // (Strapi's nested populate doesn't return all fields for relations)
    const [countryMap, brandMap, cityAreaMap] = await Promise.all([
      getAllCountries(),
      getAllBrands(),
      getAllCityAreasMap(),
    ]);

    for (const shop of prefetched) {
      enrichShopData(shop, countryMap);

      // Enrich brand data from batch-fetched brands
      // fullBrand has all top-level fields, shop.brand may have nested relations from shop populate
      // Prefer shop.brand's nested relations if populated, otherwise use fullBrand's
      if (shop.brand?.documentId) {
        const fullBrand = brandMap.get(shop.brand.documentId);
        if (fullBrand) {
          const shopLogo = shop.brand.logo;
          const shopSuppliers = shop.brand.suppliers;
          const shopCoffeePartner = shop.brand.coffee_partner;
          shop.brand = {
            ...fullBrand,
            ...shop.brand,
            // Ensure type is preserved from fullBrand if not in shop.brand
            type: shop.brand.type || fullBrand.type,
            // Use shop's nested relations if they exist and are populated, otherwise use fullBrand's
            logo: shopLogo || fullBrand.logo,
            suppliers: shopSuppliers?.length ? shopSuppliers : fullBrand.suppliers,
            coffee_partner: shopCoffeePartner || fullBrand.coffee_partner,
          };
        }
      }

      // Enrich city_area with group field if missing
      const cityArea = shop.city_area ?? shop.cityArea;
      if (cityArea?.documentId) {
        const cityAreaData = cityAreaMap.get(cityArea.documentId);
        if (cityAreaData?.group && !cityArea.group) {
          cityArea.group = cityAreaData.group;
        }
      }
    }

    // Note: localDensity is pre-calculated at build time in prefetch-data.js
    // No need to calculate here - shops already have localDensity from the prefetched JSON

    setCache(cacheKey, prefetched);
    return prefetched;
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://helpful-oasis-8bb949e05d.strapiapp.com/api';
    const fetchOptions = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_STRAPI_TOKEN}`,
      },
      next: { revalidate: 300 },
    };

    // Fetch first page to get total page count
    const firstResponse = await fetch(
      `${baseUrl}/shops?${SHOP_POPULATE}&pagination[pageSize]=100&pagination[page]=1`,
      fetchOptions
    );

    if (!firstResponse.ok) {
      throw new Error(`API Error: ${firstResponse.statusText}`);
    }

    const firstJson = await firstResponse.json();
    const pageCount = firstJson.meta?.pagination?.pageCount || 1;
    const allShops: Shop[] = [...(firstJson.data || [])];

    // Fetch remaining pages in parallel
    if (pageCount > 1) {
      const pagePromises = [];
      for (let page = 2; page <= pageCount; page++) {
        pagePromises.push(
          fetch(
            `${baseUrl}/shops?${SHOP_POPULATE}&pagination[pageSize]=100&pagination[page]=${page}`,
            fetchOptions
          ).then(res => res.ok ? res.json() : Promise.reject(new Error(`Page ${page} failed`)))
        );
      }

      const results = await Promise.all(pagePromises);
      for (const json of results) {
        allShops.push(...(json.data || []));
      }
    }

    // Fetch countries, brands, and city areas in parallel (batch fetch, not N+1)
    const [countryMap, brandMap, cityAreaMap] = await Promise.all([
      getAllCountries(),
      getAllBrands(),
      getAllCityAreasMap(),
    ]);

    // Enrich all shops with country, brand, and city area group data
    for (const shop of allShops) {
      enrichShopData(shop, countryMap);

      // Enrich brand data from batch-fetched brands
      // fullBrand has all top-level fields, shop.brand may have nested relations from shop populate
      // Prefer shop.brand's nested relations if populated, otherwise use fullBrand's
      if (shop.brand?.documentId) {
        const fullBrand = brandMap.get(shop.brand.documentId);
        if (fullBrand) {
          const shopLogo = shop.brand.logo;
          const shopSuppliers = shop.brand.suppliers;
          const shopCoffeePartner = shop.brand.coffee_partner;
          shop.brand = {
            ...fullBrand,
            ...shop.brand,
            // Ensure type is preserved from fullBrand if not in shop.brand
            type: shop.brand.type || fullBrand.type,
            // Use shop's nested relations if they exist and are populated, otherwise use fullBrand's
            logo: shopLogo || fullBrand.logo,
            suppliers: shopSuppliers?.length ? shopSuppliers : fullBrand.suppliers,
            coffee_partner: shopCoffeePartner || fullBrand.coffee_partner,
          };
        }
      }

      // Enrich city_area with group field (Strapi doesn't return it via nested populate)
      const cityArea = shop.city_area ?? shop.cityArea;
      if (cityArea?.documentId) {
        const cityAreaData = cityAreaMap.get(cityArea.documentId);
        if (cityAreaData?.group) {
          cityArea.group = cityAreaData.group;
        }
      }
    }

    // Calculate local density at runtime for non-prefetched data
    // (This path is only used when prefetched data is unavailable)
    const densities = calculateAllDensities(allShops);
    for (const shop of allShops) {
      shop.localDensity = densities.get(shop.documentId) ?? 0;
    }

    setCache(cacheKey, allShops);
    return allShops;
  } catch (error) {
    console.error('Failed to fetch all shops:', error);
    return [];
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
  // Try D1 first (fast, direct query — no need to load all 1000+ shops)
  try {
    const { getDB } = await import('./d1');
    const db = await getDB();
    const row = await db
      .prepare('SELECT s.*, b.document_id AS b_document_id, b.name AS b_name, b.type AS b_type, b.logo_url AS b_logo_url, b.statement AS b_statement, b.description AS b_description, b.story AS b_story FROM shops s LEFT JOIN brands b ON b.document_id = s.brand_document_id WHERE s.slug = ?1')
      .bind(shopSlug)
      .first();
    if (row) {
      return d1RowToShopBasic(row);
    }
  } catch (e) {
    // D1 not available (e.g. during build or local dev without D1)
  }

  // Fallback: search through all shops from Strapi/static data
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseJSONField(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') {
    try { return JSON.parse(v); } catch { return null; }
  }
  return v;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toBoolField(v: any): boolean | undefined {
  if (v === null || v === undefined) return undefined;
  return v === 1 || v === true;
}

/** Convert a D1 row to a basic Shop shape (server-side fallback) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function d1RowToShopBasic(r: any): Shop {
  return {
    id: r.id ?? 0,
    documentId: r.document_id,
    name: r.name,
    slug: r.slug,
    prefName: r.pref_name,
    description: r.description,
    address: r.address,
    neighbourhood: r.neighbourhood,
    coordinates: r.lat != null ? { lat: r.lat, lng: r.lng } : null,
    brand: r.b_document_id ? {
      documentId: r.b_document_id,
      name: r.b_name || '',
      type: r.b_type,
      logo: r.b_logo_url ? { url: r.b_logo_url } : null,
      statement: r.b_statement,
      description: r.b_description,
      story: r.b_story,
    } : undefined,
    location: r.location_document_id ? {
      documentId: r.location_document_id,
      name: r.location_name || '',
      slug: r.location_slug,
    } : undefined,
    city_area: r.city_area_document_id ? {
      documentId: r.city_area_document_id,
      name: r.city_area_name || '',
      group: r.city_area_group,
    } : undefined,
    country: r.country_code ? { id: 0, documentId: '', name: '', code: r.country_code } : undefined,
    featured_image: r.featured_image_url ? {
      url: r.featured_image_url,
      formats: parseJSONField(r.featured_image_formats),
    } : null,
    google_rating: r.google_rating,
    google_review_count: r.google_review_count,
    has_wifi: toBoolField(r.has_wifi),
    has_food: toBoolField(r.has_food),
    has_outdoor_space: toBoolField(r.has_outdoor_space),
    is_pet_friendly: toBoolField(r.is_pet_friendly),
    has_v60: toBoolField(r.has_v60),
    has_chemex: toBoolField(r.has_chemex),
    has_filter_coffee: toBoolField(r.has_filter_coffee),
    has_espresso: toBoolField(r.has_espresso),
    has_aeropress: toBoolField(r.has_aeropress),
    has_french_press: toBoolField(r.has_french_press),
    has_cold_brew: toBoolField(r.has_cold_brew),
    has_batch_brew: toBoolField(r.has_batch_brew),
    has_slow_bar: toBoolField(r.has_slow_bar),
    has_kitchen: toBoolField(r.has_kitchen),
    independent: toBoolField(r.independent),
    is_chain: toBoolField(r.is_chain),
    opening_hours: parseJSONField(r.opening_hours),
    public_tags: parseJSONField(r.public_tags),
    website: r.website,
    phone: r.phone,
    instagram: r.instagram,
    facebook: r.facebook,
    tiktok: r.tiktok,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  } as Shop;
}
