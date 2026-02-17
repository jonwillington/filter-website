import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * Get D1 database binding.
 * Returns null when running outside Cloudflare (e.g. `next dev`).
 */
export async function getDB(): Promise<D1Database | null> {
  try {
    const { env } = await getCloudflareContext();
    return (env as Record<string, unknown>).DB as D1Database;
  } catch {
    return null;
  }
}

/** Production API base URL for dev proxy fallback */
const PROD_API = 'https://filter-website.pages.dev';

/**
 * Proxy a request to the production API.
 * Used as fallback when D1 is unavailable (local dev).
 */
export async function proxyToProd(path: string): Promise<Response> {
  const url = `${PROD_API}${path}`;
  console.log(`[dev-proxy] D1 unavailable, proxying to ${url}`);
  const res = await fetch(url);
  return new Response(res.body, {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('Content-Type') || 'application/json',
    },
  });
}
