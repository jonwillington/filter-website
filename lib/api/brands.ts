import { getCached, setCache } from './cache';

export interface Brand {
  id: number;
  documentId: string;
  name: string;
  type?: string;
  role?: string;
  price?: string;
  description?: string;
  story?: string;
  founded?: string;
  hq?: string;
  Founder?: string;
  website?: string;
  phone?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  twitter?: string;
  youtube?: string;
  whatsapp?: string;
  line?: string;
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
  has_siphon?: boolean;
  oatMilk?: boolean;
  plantMilk?: boolean;
  roastOwnBeans?: boolean;
  ownRoastDesc?: string;
  ownBeanLink?: string;
  specializes_light?: boolean;
  specializes_medium?: boolean;
  specializes_dark?: boolean;
  quality_tier?: string;
  equipment?: {
    drippers?: string[];
    espresso?: string[];
    grinders?: string[];
    roasters?: string[];
  } | null;
  awards?: any[];
  logo?: any;
  suppliers?: any[];
  coffee_partner?: any;
  ownRoastCountry?: any;
  country?: any;
}

export interface ApiResponse<T> {
  data: T;
  meta?: any;
}

/**
 * Fetch all brands from D1.
 * Returns a Map for O(1) lookup by documentId.
 */
export async function getAllBrands(): Promise<Map<string, Brand>> {
  const cacheKey = 'brands:all';
  const cached = getCached<Map<string, Brand>>(cacheKey);
  if (cached) return cached;

  // D1 is the source of truth
  try {
    const { getAllBrandsD1 } = await import('./d1-queries');
    const brands = await getAllBrandsD1();
    if (brands && brands.length > 0) {
      const brandMap = new Map<string, Brand>();
      for (const brand of brands) {
        if (brand.documentId) {
          brandMap.set(brand.documentId, brand as unknown as Brand);
        }
      }
      setCache(cacheKey, brandMap);
      return brandMap;
    }
  } catch {
    // D1 not available (build time, dev without D1)
  }

  return new Map();
}

export async function getBrandById(documentId: string): Promise<Brand | null> {
  const brandMap = await getAllBrands();
  return brandMap.get(documentId) || null;
}
