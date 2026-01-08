import { Shop, Country, Location } from '../types';
import { getShopSlug as generateShopSlug } from '../utils';
import { getCached, setCache, getPrefetched } from './cache';
import { getAllBrands, Brand } from './brands';

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
  'populate[brand][populate][suppliers][populate][bg_image]=*',
  'populate[brand][populate][suppliers][populate][country]=*',
  'populate[brand][populate][suppliers][populate][ownRoastCountry]=*',
  'populate[brand][populate][suppliers][fields][0]=id',
  'populate[brand][populate][suppliers][fields][1]=documentId',
  'populate[brand][populate][suppliers][fields][2]=name',
  'populate[brand][populate][suppliers][fields][3]=story',
  'populate[brand][populate][suppliers][fields][4]=website',
  'populate[brand][populate][suppliers][fields][5]=instagram',
  'populate[brand][populate][suppliers][fields][6]=founded',
  'populate[brand][populate][suppliers][fields][7]=facebook',
  'populate[brand][populate][suppliers][fields][8]=tiktok',
  'populate[brand][populate][coffee_partner][populate][logo]=*',
  'populate[brand][populate][coffee_partner][populate][bg_image]=*',
  'populate[brand][populate][coffee_partner][populate][country]=*',
  'populate[brand][populate][coffee_partner][fields][0]=id',
  'populate[brand][populate][coffee_partner][fields][1]=documentId',
  'populate[brand][populate][coffee_partner][fields][2]=name',
  'populate[brand][populate][coffee_partner][fields][3]=story',
  'populate[brand][populate][coffee_partner][fields][4]=website',
  'populate[brand][populate][coffee_partner][fields][5]=instagram',
  'populate[brand][populate][ownRoastCountry]=*',
  // Other shop fields
  'populate[featured_image]=*',
  'populate[gallery]=*',
  // Populate city_area with all fields including group
  'populate[city_area][fields][0]=id',
  'populate[city_area][fields][1]=documentId',
  'populate[city_area][fields][2]=name',
  'populate[city_area][fields][3]=slug',
  'populate[city_area][fields][4]=group',
  'populate[city_area][fields][5]=description',
  'populate[city_area][fields][6]=summary',
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
  const cacheKey = 'countries:all';
  const cached = getCached<Map<string, Country>>(cacheKey);
  if (cached) return cached;

  // Check for pre-fetched data
  const prefetched = getPrefetched<Country[]>('countries');
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
  const prefetched = getPrefetched<Array<{ documentId: string; group?: string | null }>>('city-areas');
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
    const cityAreaMap = new Map<string, { group: string | null }>();
    let page = 1;
    let pageCount = 1;

    while (page <= pageCount) {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_URL || 'https://helpful-oasis-8bb949e05d.strapiapp.com/api'}/city-areas?fields[0]=documentId&fields[1]=group&pagination[pageSize]=100&pagination[page]=${page}`,
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
        if (cityArea.documentId) {
          cityAreaMap.set(cityArea.documentId, { group: cityArea.group || null });
        }
      }

      pageCount = json.meta?.pagination?.pageCount || 1;
      page++;
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
  const prefetched = getPrefetched<Shop[]>('shops');
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

    setCache(cacheKey, prefetched);
    return prefetched;
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
