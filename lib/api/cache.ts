/**
 * Build-time cache for API responses
 *
 * This cache persists across the entire build process to prevent
 * redundant API calls when generating static pages.
 *
 * The cache uses a longer TTL during build (30 min) since data
 * doesn't change during a single build run.
 */

type CacheEntry = { data: unknown; timestamp: number };
type CacheMap = Map<string, CacheEntry>;

// Lazy initialization to avoid module-level side effects (breaks HMR)
function getCache(): CacheMap {
  const g = globalThis as typeof globalThis & { __apiCache?: CacheMap };
  if (!g.__apiCache) {
    g.__apiCache = new Map();
  }
  return g.__apiCache;
}

// 30 minutes for build, 5 minutes for runtime
const BUILD_CACHE_TTL = 30 * 60 * 1000;
const RUNTIME_CACHE_TTL = 5 * 60 * 1000;

function getCacheTTL(): number {
  // During build, use longer TTL
  if (process.env.NODE_ENV === 'production' || process.env.NEXT_PHASE === 'phase-production-build') {
    return BUILD_CACHE_TTL;
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
