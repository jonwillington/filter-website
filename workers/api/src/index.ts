/**
 * Filter API — https://api.filter.coffee
 *
 * Read API for the native apps (contract: types/api-v3.ts, docs: docs/api-v3.md),
 * served from the same D1 database as the website. /api/v2 on the website is untouched.
 *
 * Caching: every response is keyed by a content version derived from D1 (row counts and
 * latest `updated_at` per table). Any change in D1 produces a new version, so cached
 * responses never need purging and ETags stay correct across data centres.
 */

import type { ApiErrorCode, ApiResponse } from '../../../types/api-v3';
import { findCity, getBrand, getCatalog, getCity, getDiscover, getShop, listCities } from './content';
import { handleStrapiWebhook } from './webhook';

export interface Env {
  DB: D1Database;
  STRAPI_URL: string;
  STRAPI_TOKEN: string;
  WEBHOOK_SECRET: string;
}

const CLIENT_CACHE_CONTROL = 'public, max-age=60, stale-while-revalidate=600';
const VERSION_TTL_MS = 30_000;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    try {
      if (url.pathname === '/webhooks/strapi') {
        if (request.method !== 'POST') return error(405, 'method_not_allowed', 'Use POST');
        const res = await handleStrapiWebhook(request, env);
        versionCache = null;
        return res;
      }

      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() });
      if (request.method !== 'GET' && request.method !== 'HEAD') return error(405, 'method_not_allowed', 'Use GET');

      if (url.pathname === '/' || url.pathname === '/v3') {
        return json({ name: 'Filter API', version: 'v3', docs: 'https://github.com/jonwillington/filter-website/blob/main/docs/api-v3.md' });
      }

      const route = matchRoute(url.pathname);
      if (!route) return error(404, 'not_found', `No route for ${url.pathname}`);

      return await cached(request, env, ctx, route);
    } catch (err) {
      console.error('Unhandled error', url.pathname, err);
      return error(500, 'internal_error', 'Something went wrong');
    }
  },
};

// ─── Routing ──────────────────────────────────────────────────────────────────

type Route =
  | { name: 'cities' }
  | { name: 'city'; city: string }
  | { name: 'catalog'; city: string }
  | { name: 'discover'; city: string }
  | { name: 'shop'; id: string }
  | { name: 'brand'; id: string };

function matchRoute(pathname: string): Route | null {
  const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (parts[0] !== 'v3') return null;
  const [, resource, key, sub] = parts;

  if (resource === 'cities') {
    if (parts.length === 2) return { name: 'cities' };
    if (parts.length === 3) return { name: 'city', city: key };
    if (parts.length === 4 && sub === 'catalog') return { name: 'catalog', city: key };
    if (parts.length === 4 && sub === 'discover') return { name: 'discover', city: key };
  }
  if (resource === 'shops' && parts.length === 3) return { name: 'shop', id: key };
  if (resource === 'brands' && parts.length === 3) return { name: 'brand', id: key };
  return null;
}

async function build(route: Route, url: URL, env: Env): Promise<{ data: unknown } | { status: number; code: ApiErrorCode; message: string }> {
  const db = env.DB;

  switch (route.name) {
    case 'cities':
      return { data: await listCities(db) };

    case 'shop': {
      const shop = await getShop(db, route.id);
      return shop ? { data: shop } : { status: 404, code: 'not_found', message: `Shop ${route.id} not found` };
    }

    case 'brand': {
      const brand = await getBrand(db, route.id);
      return brand ? { data: brand } : { status: 404, code: 'not_found', message: `Brand ${route.id} not found` };
    }

    default: {
      const location = await findCity(db, route.city);
      if (!location) return { status: 404, code: 'not_found', message: `City ${route.city} not found` };

      if (route.name === 'city') {
        return { data: await getCity(db, location, url.searchParams.get('boundaries') === 'full') };
      }
      if (route.name === 'catalog') {
        return { data: await getCatalog(db, location) };
      }
      return {
        data: await getDiscover(db, location, {
          events: limit(url.searchParams.get('events')),
          news: limit(url.searchParams.get('news')),
        }),
      };
    }
  }
}

function limit(value: string | null): number {
  const n = Number(value);
  if (!value || !Number.isFinite(n)) return 20;
  return Math.max(0, Math.min(50, Math.floor(n)));
}

// ─── Caching ──────────────────────────────────────────────────────────────────

async function cached(request: Request, env: Env, ctx: ExecutionContext, route: Route): Promise<Response> {
  const url = new URL(request.url);
  const version = await contentVersion(env.DB);
  const etag = `"${version}"`;

  if (matchesEtag(request.headers.get('if-none-match'), version)) {
    return new Response(null, { status: 304, headers: { ETag: etag, 'Cache-Control': CLIENT_CACHE_CONTROL, ...corsHeaders() } });
  }

  const cacheKey = new Request(`https://cache.api.filter.coffee/${version}${url.pathname}?${normalisedQuery(url, route)}`);
  const cache = caches.default;

  const hit = await cache.match(cacheKey);
  if (hit) return withClientHeaders(hit, etag, 'HIT');

  const result = await build(route, url, env);
  if (!('data' in result)) return error(result.status, result.code, result.message);

  const body: ApiResponse<unknown> = {
    data: result.data,
    meta: { version, generatedAt: new Date().toISOString() },
  };
  const response = new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // Keyed by version, so the edge copy can live as long as the cache keeps it.
      'Cache-Control': 'public, s-maxage=86400',
    },
  });
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return withClientHeaders(response, etag, 'MISS');
}

/** Only the query params a route reads, sorted, so `?a=1&b=2` and `?b=2&a=1&utm=x` share a cache entry. */
function normalisedQuery(url: URL, route: Route): string {
  const allowed: Record<Route['name'], string[]> = {
    cities: [],
    city: ['boundaries'],
    catalog: [],
    discover: ['events', 'news'],
    shop: [],
    brand: [],
  };
  return allowed[route.name]
    .filter(k => url.searchParams.has(k))
    .sort()
    .map(k => `${k}=${encodeURIComponent(url.searchParams.get(k)!)}`)
    .join('&');
}

function withClientHeaders(response: Response, etag: string, cacheStatus: 'HIT' | 'MISS'): Response {
  const headers = new Headers(response.headers);
  headers.set('ETag', etag);
  headers.set('Cache-Control', CLIENT_CACHE_CONTROL);
  headers.set('x-api-cache', cacheStatus);
  for (const [k, v] of Object.entries(corsHeaders())) headers.set(k, v);
  return new Response(response.body, { status: response.status, headers });
}

function matchesEtag(header: string | null, version: string): boolean {
  if (!header) return false;
  if (header.trim() === '*') return true;
  return header.split(',').some(tag => tag.trim().replace(/^W\//, '').replace(/"/g, '') === version);
}

let versionCache: { at: number; version: string } | null = null;

const VERSIONED_TABLES: Array<{ table: string; updatedAt: boolean }> = [
  { table: 'shops', updatedAt: true },
  { table: 'brands', updatedAt: true },
  { table: 'beans', updatedAt: true },
  { table: 'locations', updatedAt: true },
  { table: 'countries', updatedAt: true },
  { table: 'city_areas', updatedAt: true },
  { table: 'brand_suppliers', updatedAt: false },
  { table: 'brand_roast_countries', updatedAt: false },
  { table: 'bean_origins', updatedAt: false },
  { table: 'bean_flavor_tags', updatedAt: false },
  { table: 'events', updatedAt: true },
  { table: 'shop_events', updatedAt: false },
  { table: 'people', updatedAt: true },
  { table: 'person_picks', updatedAt: true },
  { table: 'news_articles', updatedAt: true },
  { table: 'news_article_locations', updatedAt: false },
  { table: 'news_article_shops', updatedAt: false },
  { table: 'news_article_brands', updatedAt: false },
  { table: 'coffee_partners', updatedAt: true },
  { table: 'attractions', updatedAt: true },
];

/**
 * Bump whenever response shapes change (e.g. a field is added). It's part of the
 * content version, so edge-cached responses and client ETags from the previous
 * shape stop matching even though D1 hasn't changed.
 *   2: ShopSummary.prefName, BrandShopRef.prefName (2026-09-17)
 *   3: Catalog.attractions, ShopDetail.nearbyAttractions (2026-09-24)
 */
const RESPONSE_SHAPE = 3;

/**
 * A short hash of every table's row count and latest `updated_at`.
 * Recomputed at most every 30 s per isolate, and straight after a webhook.
 */
async function contentVersion(db: D1Database): Promise<string> {
  if (versionCache && Date.now() - versionCache.at < VERSION_TTL_MS) return versionCache.version;

  const existing = await db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all<{ name: string }>();
  const names = new Set(existing.results.map(r => r.name));

  const parts = VERSIONED_TABLES.filter(t => names.has(t.table)).map(t =>
    t.updatedAt
      ? `(SELECT COUNT(*) || ':' || IFNULL(MAX(updated_at), '') FROM ${t.table})`
      : `(SELECT COUNT(*) FROM ${t.table})`,
  );
  const row = await db.prepare(`SELECT ${parts.join(" || '|' || ")} AS signature`).first<{ signature: string }>();

  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`v3|${RESPONSE_SHAPE}|${row?.signature ?? ''}`));
  const version = [...new Uint8Array(digest).slice(0, 8)].map(b => b.toString(16).padStart(2, '0')).join('');

  versionCache = { at: Date.now(), version };
  return version;
}

// ─── Responses ────────────────────────────────────────────────────────────────

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'If-None-Match',
    'Access-Control-Expose-Headers': 'ETag, x-api-cache',
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders() },
  });
}

function error(status: number, code: ApiErrorCode, message: string): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...corsHeaders() },
  });
}
