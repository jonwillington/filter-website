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
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_STRAPI_URL || 'https://helpful-oasis-8bb949e05d.strapiapp.com/api'}/countries?pagination[pageSize]=500`,
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

    countriesCache = countries;
    cacheTimestamp = now;
    return countries;
  } catch (error) {
    console.error('Failed to fetch countries:', error);
    return countriesCache ?? [];
  }
}
