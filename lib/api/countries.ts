import { apiClient } from './client';
import { Country } from '../types';

// Cache for countries (initialized lazily to avoid HMR issues)
let countriesCache: Country[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Fetch all countries
export async function getAllCountries(): Promise<Country[]> {
  const now = Date.now();

  if (countriesCache && now - cacheTimestamp < CACHE_TTL) {
    return countriesCache;
  }

  try {
    // Use explicit field population instead of populate=* to avoid circular reference errors
    const countries = await apiClient<Country[]>(
      '/countries?pagination[pageSize]=500&populate[region][fields][0]=Name&populate[region][fields][1]=comingSoon',
      { revalidate: 300 }
    );

    countriesCache = countries;
    cacheTimestamp = now;
    return countries;
  } catch (error) {
    console.error('Failed to fetch countries:', error);
    return countriesCache ?? [];
  }
}
