import { getCached, setCache, getPrefetched } from './cache';

export interface Brand {
  id: number;
  documentId: string;
  name: string;
  type?: string;
  description?: string;
  story?: string;
  website?: string;
  phone?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  has_wifi?: boolean;
  has_food?: boolean;
  has_outdoor_space?: boolean;
  is_pet_friendly?: boolean;
  has_espresso?: boolean;
  has_filter_coffee?: boolean;
  has_v60?: boolean;
  has_chemex?: boolean;
  has_aeropress?: boolean;
  has_french_press?: boolean;
  has_cold_brew?: boolean;
  has_batch_brew?: boolean;
  roastOwnBeans?: boolean;
  ownRoastDesc?: string;
  logo?: any;
  suppliers?: any[];
  coffee_partner?: any;
}

export interface ApiResponse<T> {
  data: T;
  meta?: any;
}

/**
 * Fetch all brands in a single batch request
 * Returns a Map for O(1) lookup by documentId
 */
export async function getAllBrands(): Promise<Map<string, Brand>> {
  const cacheKey = 'brands:all';
  const cached = getCached<Map<string, Brand>>(cacheKey);
  if (cached) return cached;

  // Check for pre-fetched data (from build-time prefetch script)
  const prefetched = await getPrefetched<Brand[]>('brands');
  if (prefetched) {
    const brandMap = new Map<string, Brand>();
    for (const brand of prefetched) {
      if (brand.documentId) {
        brandMap.set(brand.documentId, brand);
      }
    }
    setCache(cacheKey, brandMap);
    return brandMap;
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://helpful-oasis-8bb949e05d.strapiapp.com/api';
    const populateParams = [
      'populate[logo][fields][0]=url',
      'populate[logo][fields][1]=formats',
      'populate[suppliers][populate][logo][fields][0]=url',
      'populate[suppliers][populate][logo][fields][1]=formats',
      'populate[suppliers][populate][bg-image][fields][0]=url',
      'populate[suppliers][populate][bg-image][fields][1]=formats',
      'populate[suppliers][populate][country][fields][0]=name',
      'populate[suppliers][populate][country][fields][1]=code',
      'populate[suppliers][populate][ownRoastCountry][fields][0]=name',
      'populate[suppliers][populate][ownRoastCountry][fields][1]=code',
      'populate[ownRoastCountry][fields][0]=name',
      'populate[ownRoastCountry][fields][1]=code',
    ].join('&');
    const fetchOptions = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_STRAPI_TOKEN}`,
      },
      next: { revalidate: 300 },
    };

    // Fetch first page to get total page count
    const firstResponse = await fetch(
      `${baseUrl}/brands?${populateParams}&pagination[pageSize]=100&pagination[page]=1`,
      fetchOptions
    );

    if (!firstResponse.ok) {
      throw new Error(`Brands API Error: ${firstResponse.statusText}`);
    }

    const firstJson = await firstResponse.json();
    const pageCount = firstJson.meta?.pagination?.pageCount || 1;
    const allBrands: Brand[] = [...(firstJson.data || [])];

    // Fetch remaining pages in parallel
    if (pageCount > 1) {
      const pagePromises = [];
      for (let page = 2; page <= pageCount; page++) {
        pagePromises.push(
          fetch(
            `${baseUrl}/brands?${populateParams}&pagination[pageSize]=100&pagination[page]=${page}`,
            fetchOptions
          ).then(res => res.ok ? res.json() : Promise.reject(new Error(`Page ${page} failed`)))
        );
      }

      const results = await Promise.all(pagePromises);
      for (const json of results) {
        allBrands.push(...(json.data || []));
      }
    }

    // Create lookup map by documentId
    const brandMap = new Map<string, Brand>();
    for (const brand of allBrands) {
      if (brand.documentId) {
        brandMap.set(brand.documentId, brand);
      }
    }

    setCache(cacheKey, brandMap);
    return brandMap;
  } catch (error) {
    console.error('Failed to fetch brands:', error);
    return new Map();
  }
}

export async function getBrandById(documentId: string): Promise<Brand | null> {
  // Use batch-fetched brands cache when available
  const brandMap = await getAllBrands();
  const cached = brandMap.get(documentId);
  if (cached) return cached;

  // Fallback to individual fetch (shouldn't happen often)
  try {
    const populateParams = [
      'populate[logo][fields][0]=url',
      'populate[logo][fields][1]=formats',
      'populate[suppliers][populate][logo][fields][0]=url',
      'populate[suppliers][populate][logo][fields][1]=formats',
      'populate[suppliers][populate][bg-image][fields][0]=url',
      'populate[suppliers][populate][bg-image][fields][1]=formats',
      'populate[suppliers][populate][country][fields][0]=name',
      'populate[suppliers][populate][country][fields][1]=code',
      'populate[ownRoastCountry][fields][0]=name',
      'populate[ownRoastCountry][fields][1]=code',
    ].join('&');
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_STRAPI_URL || 'https://helpful-oasis-8bb949e05d.strapiapp.com/api'}/brands/${documentId}?${populateParams}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_STRAPI_TOKEN}`,
        },
        next: { revalidate: 300 },
      }
    );

    if (!response.ok) {
      console.error(`Failed to fetch brand ${documentId}:`, response.statusText);
      return null;
    }

    const json: ApiResponse<Brand> = await response.json();
    return json.data;
  } catch (error) {
    console.error(`Error fetching brand ${documentId}:`, error);
    return null;
  }
}
