import { Country } from '../types';
import { getCached, setCache, loadFromStaticFile } from './cache';

export async function getAllCountries(): Promise<Country[]> {
  const cacheKey = 'countries:list';
  const cached = getCached<Country[]>(cacheKey);
  if (cached) return cached;

  // Try D1 first (edge SQLite — fast, always fresh via webhooks)
  try {
    const { getAllCountriesD1 } = await import('./d1-queries');
    const d1Countries = await getAllCountriesD1();
    if (d1Countries && d1Countries.length > 0) {
      console.log('[Countries API] Loaded from D1:', d1Countries.length);
      setCache(cacheKey, d1Countries);
      return d1Countries;
    }
  } catch {
    // D1 not available (build time, dev without D1)
  }

  // Try static file first (prefetched data)
  const staticData = await loadFromStaticFile<Country[]>('countries');
  if (staticData && staticData.length > 0) {
    console.log('[Countries API] Loaded from static file:', staticData.length);
    setCache(cacheKey, staticData);
    return staticData;
  }

  // Fall back to live Strapi API
  try {
    const { apiClient } = await import('./client');
    const countries = await apiClient<Country[]>(
      '/countries?pagination[pageSize]=500&populate[region][fields][0]=Name&populate[region][fields][1]=comingSoon',
      { revalidate: 300 }
    );
    setCache(cacheKey, countries);
    return countries;
  } catch (error) {
    console.error('Failed to fetch countries:', error);
    return [];
  }
}
