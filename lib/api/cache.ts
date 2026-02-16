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

    // Shops, brands, city-areas, locations, and countries are served from D1 at runtime
    // Only small static datasets (events, people, etc.) use bundled prefetch

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

// Fetch from static JSON files
// In dev: reads from filesystem. On Cloudflare Workers: fetches from own static assets.
async function fetchStaticData<T>(key: string): Promise<T | null> {
  // Map keys to file names
  // Shops, brands, city-areas, locations, and countries are served from D1 API routes
  const fileMap: Record<string, string> = {
    regions: 'regions.json',
    events: 'events.json',
    people: 'people.json',
    'news-articles': 'news-articles.json',
  };

  const fileName = fileMap[key];
  if (!fileName) return null;

  // Try filesystem first (works in dev and during build)
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
      // Filesystem not available (e.g. Cloudflare Workers)
    }
  }

  // Fallback: fetch from own static assets (works on Cloudflare Pages Workers)
  // The static JSON files are deployed as CDN assets alongside the Worker
  try {
    const siteUrl = process.env.SITE_URL || process.env.CF_PAGES_URL || 'https://filter.coffee';
    const response = await fetch(`${siteUrl}/data/${fileName}`);
    if (response.ok) {
      const data = await response.json();
      console.log(`[Cache] Loaded ${key} from static URL: ${Array.isArray(data) ? data.length : 1} items`);
      return data as T;
    }
  } catch (e) {
    console.log(`[Cache] Could not fetch ${key} from static URL`);
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
