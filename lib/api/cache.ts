/**
 * Build-time cache for API responses
 *
 * This cache persists across the entire build process to prevent
 * redundant API calls when generating static pages.
 *
 * Pre-fetched data is bundled at build time via lib/data/prefetched.ts
 * This works in Cloudflare Workers which don't have filesystem access.
 */

type CacheEntry = { data: unknown; timestamp: number };
type CacheMap = Map<string, CacheEntry>;

// Try to load bundled prefetched data (generated at build time)
let prefetchedData: Map<string, unknown> | null = null;
let prefetchAttempted = false;

async function loadPrefetchedData(): Promise<Map<string, unknown>> {
  if (prefetchedData) return prefetchedData;
  if (prefetchAttempted) return new Map();

  prefetchAttempted = true;
  prefetchedData = new Map();

  try {
    // Dynamic import to handle case where file doesn't exist (dev mode)
    const prefetched = await import('@/lib/data/prefetched');

    if (prefetched.prefetchedShops?.length > 0) {
      prefetchedData.set('shops', prefetched.prefetchedShops);
      console.log(`[Cache] Loaded bundled shops: ${prefetched.prefetchedShops.length} items`);
    }
    if (prefetched.prefetchedCountries?.length > 0) {
      prefetchedData.set('countries', prefetched.prefetchedCountries);
      console.log(`[Cache] Loaded bundled countries: ${prefetched.prefetchedCountries.length} items`);
    }
    if (prefetched.prefetchedCityAreas?.length > 0) {
      prefetchedData.set('city-areas', prefetched.prefetchedCityAreas);
      console.log(`[Cache] Loaded bundled city-areas: ${prefetched.prefetchedCityAreas.length} items`);
    }
    if (prefetched.prefetchedBrands?.length > 0) {
      prefetchedData.set('brands', prefetched.prefetchedBrands);
      console.log(`[Cache] Loaded bundled brands: ${prefetched.prefetchedBrands.length} items`);
    }
    if (prefetched.prefetchedLocations?.length > 0) {
      prefetchedData.set('locations', prefetched.prefetchedLocations);
      console.log(`[Cache] Loaded bundled locations: ${prefetched.prefetchedLocations.length} items`);
    }

    if (prefetched.PREFETCH_TIMESTAMP) {
      const age = Date.now() - prefetched.PREFETCH_TIMESTAMP;
      console.log(`[Cache] Prefetch data age: ${Math.round(age / 1000 / 60)} minutes`);
    }
  } catch (e) {
    // Prefetched module doesn't exist (dev mode or first build)
    console.log('[Cache] No bundled prefetch data available, will fetch from API');
  }

  return prefetchedData;
}

// Fetch from static JSON files (used in dev mode when bundled data is empty)
async function fetchStaticData<T>(key: string): Promise<T | null> {
  // Map keys to file names
  const fileMap: Record<string, string> = {
    shops: 'shops.json',
    countries: 'countries.json',
    'city-areas': 'city-areas.json',
    brands: 'brands.json',
    locations: 'locations.json',
    regions: 'regions.json',
    events: 'events.json',
    people: 'people.json',
    'news-articles': 'news-articles.json',
  };

  const fileName = fileMap[key];
  if (!fileName) return null;

  // In development, read directly from filesystem (more reliable than fetching)
  if (typeof process !== 'undefined' && process.cwd) {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const filePath = path.join(process.cwd(), 'public', 'data', fileName);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(fileContent);
      console.log(`[Cache] Loaded ${key} from static file: ${Array.isArray(data) ? data.length : 1} items`);
      return data as T;
    } catch (e) {
      console.log(`[Cache] Could not load ${key} from static file:`, e);
    }
  }

  return null;
}

// Synchronous version that returns cached result (call loadPrefetchedData first)
function getPrefetchedSync(): Map<string, unknown> {
  return prefetchedData || new Map();
}

export async function getPrefetched<T>(key: string): Promise<T | null> {
  const data = await loadPrefetchedData();
  const bundled = data.get(key) as T;

  console.log(`[getPrefetched] key=${key}, hasBundled=${!!bundled}, NODE_ENV=${process.env.NODE_ENV}`);

  if (bundled) return bundled;

  // Fallback to static JSON files (dev mode when bundled data is empty)
  // Also try in production if bundled data is missing (placeholder module)
  const staticData = await fetchStaticData<T>(key);
  if (staticData) {
    // Cache it for subsequent calls
    data.set(key, staticData);
    return staticData;
  }

  console.log(`[getPrefetched] No data found for ${key}`);
  return null;
}

export function getPrefetchedImmediate<T>(key: string): T | null {
  const data = getPrefetchedSync();
  return (data.get(key) as T) || null;
}

export async function hasPrefetchedData(): Promise<boolean> {
  const data = await loadPrefetchedData();
  return data.size > 0;
}

// Lazy initialization to avoid module-level side effects (breaks HMR)
function getCache(): CacheMap {
  const g = globalThis as typeof globalThis & { __apiCache?: CacheMap };
  if (!g.__apiCache) {
    g.__apiCache = new Map();
  }
  return g.__apiCache;
}

// 30 minutes for build, 5 minutes for production runtime, 30 seconds for dev
const BUILD_CACHE_TTL = 30 * 60 * 1000;
const RUNTIME_CACHE_TTL = 5 * 60 * 1000;
const DEV_CACHE_TTL = 30 * 1000; // 30 seconds for faster iteration

function getCacheTTL(): number {
  // During build, use longer TTL
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return BUILD_CACHE_TTL;
  }
  // In development, use short TTL for faster iteration
  if (process.env.NODE_ENV === 'development') {
    return DEV_CACHE_TTL;
  }
  return RUNTIME_CACHE_TTL;
}

export function getCached<T>(key: string): T | null {
  const cache = getCache();
  const entry = cache.get(key);
  if (!entry) return null;

  const ttl = getCacheTTL();
  if (Date.now() - entry.timestamp > ttl) {
    cache.delete(key);
    return null;
  }

  return entry.data as T;
}

export function setCache<T>(key: string, data: T): void {
  getCache().set(key, { data, timestamp: Date.now() });
}

export function clearCache(): void {
  getCache().clear();
}

export function getCacheStats(): { size: number; keys: string[] } {
  const cache = getCache();
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}

// Public export for loading from static files
export async function loadFromStaticFile<T>(key: string): Promise<T | null> {
  return fetchStaticData<T>(key);
}
