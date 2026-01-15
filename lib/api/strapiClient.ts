/**
 * Unified Strapi API Client
 *
 * Single source of truth for all Strapi API calls.
 * Provides consistent error handling, logging, and caching strategies.
 */

// Configuration
const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://helpful-oasis-8bb949e05d.strapiapp.com/api';
const STRAPI_TOKEN = process.env.NEXT_PUBLIC_STRAPI_TOKEN;

// Error class for API errors
export class StrapiError extends Error {
  constructor(
    public status: number,
    public endpoint: string,
    message: string
  ) {
    super(message);
    this.name = 'StrapiError';
  }
}

// Response type for Strapi API
export interface StrapiResponse<T> {
  data: T;
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

// Options for fetch requests
export interface StrapiRequestOptions {
  /** Revalidation time in seconds (default: 300). Set to 0 for no caching. */
  revalidate?: number;
  /** Skip Next.js cache entirely (for large responses >2MB) */
  skipNextCache?: boolean;
  /** Additional headers */
  headers?: Record<string, string>;
}

/**
 * Build the full URL for a Strapi endpoint
 */
export function buildUrl(endpoint: string, params?: string): string {
  const base = `${STRAPI_URL}${endpoint}`;
  return params ? `${base}?${params}` : base;
}

/**
 * Get default headers for Strapi requests
 */
function getHeaders(additionalHeaders?: Record<string, string>): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${STRAPI_TOKEN}`,
    ...additionalHeaders,
  };
}

/**
 * Fetch data from Strapi API
 *
 * @param endpoint - The API endpoint (e.g., '/shops', '/brands/123')
 * @param params - Query parameters string (e.g., 'populate=*&pagination[pageSize]=100')
 * @param options - Request options
 * @returns The data from the response (unwrapped from Strapi's { data } wrapper)
 */
export async function strapiGet<T>(
  endpoint: string,
  params?: string,
  options: StrapiRequestOptions = {}
): Promise<T> {
  const { revalidate = 300, skipNextCache = false, headers } = options;
  const url = buildUrl(endpoint, params);

  const fetchOptions: RequestInit & { next?: { revalidate: number } } = {
    headers: getHeaders(headers),
  };

  // Handle caching strategy
  if (skipNextCache) {
    // For large responses that exceed Next.js cache limits
    fetchOptions.cache = 'no-store';
  } else {
    fetchOptions.next = { revalidate };
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    throw new StrapiError(
      response.status,
      endpoint,
      `Strapi API Error: ${response.statusText}`
    );
  }

  const json: StrapiResponse<T> | T = await response.json();

  // Unwrap Strapi's data wrapper
  if (json && typeof json === 'object' && 'data' in json) {
    return (json as StrapiResponse<T>).data;
  }

  return json as T;
}

/**
 * Fetch paginated data from Strapi API
 * Automatically fetches all pages and combines results
 *
 * @param endpoint - The API endpoint (e.g., '/shops')
 * @param params - Base query parameters (pagination params will be added)
 * @param options - Request options
 * @returns Combined array of all items from all pages
 */
export async function strapiGetAll<T>(
  endpoint: string,
  params?: string,
  options: StrapiRequestOptions = {}
): Promise<T[]> {
  const { revalidate = 300, skipNextCache = false, headers } = options;
  const allItems: T[] = [];
  let page = 1;
  let pageCount = 1;

  while (page <= pageCount) {
    const paginationParams = `pagination[pageSize]=100&pagination[page]=${page}`;
    const fullParams = params ? `${params}&${paginationParams}` : paginationParams;
    const url = buildUrl(endpoint, fullParams);

    const fetchOptions: RequestInit & { next?: { revalidate: number } } = {
      headers: getHeaders(headers),
    };

    if (skipNextCache) {
      fetchOptions.cache = 'no-store';
    } else {
      fetchOptions.next = { revalidate };
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      throw new StrapiError(
        response.status,
        endpoint,
        `Strapi API Error: ${response.statusText}`
      );
    }

    const json: StrapiResponse<T[]> = await response.json();
    allItems.push(...(json.data || []));

    pageCount = json.meta?.pagination?.pageCount || 1;
    page++;
  }

  return allItems;
}

/**
 * Helper to build populate query params for nested relations
 *
 * Example:
 * buildPopulate({
 *   brand: ['name', 'type', 'description'],
 *   'brand.logo': ['url', 'formats'],
 *   featured_image: '*',
 * })
 *
 * Returns: 'populate[brand][fields][0]=name&populate[brand][fields][1]=type&...'
 */
export function buildPopulate(config: Record<string, string[] | '*'>): string {
  const parts: string[] = [];

  for (const [path, fields] of Object.entries(config)) {
    if (fields === '*') {
      // Simple wildcard populate
      parts.push(`populate[${path}]=*`);
    } else {
      // Field-specific populate
      const segments = path.split('.');
      let prefix = 'populate';

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        if (i === segments.length - 1) {
          // Last segment - add fields
          fields.forEach((field, index) => {
            parts.push(`${prefix}[${segment}][fields][${index}]=${field}`);
          });
        } else {
          // Intermediate segment - add populate
          prefix = `${prefix}[${segment}][populate]`;
        }
      }
    }
  }

  return parts.join('&');
}
