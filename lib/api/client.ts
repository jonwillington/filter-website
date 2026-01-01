/**
 * Get Strapi config based on environment
 * Development: local Strapi (http://localhost:1337)
 * Production: cloud Strapi (helpful-oasis)
 */
function getStrapiConfig() {
  const isProd = process.env.NEXT_PUBLIC_ENV === 'production' ||
                 process.env.NODE_ENV === 'production';

  if (isProd) {
    return {
      url: process.env.NEXT_PUBLIC_STRAPI_URL_PROD || 'https://helpful-oasis-8bb949e05d.strapiapp.com/api',
      token: process.env.NEXT_PUBLIC_STRAPI_TOKEN_PROD,
    };
  } else {
    return {
      url: process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337/api',
      token: process.env.NEXT_PUBLIC_STRAPI_TOKEN,
    };
  }
}

const { url: API_BASE_URL, token: API_TOKEN } = getStrapiConfig();

// Debug: Log which Strapi instance is being used
if (typeof window !== 'undefined') {
  console.log('[Strapi] Using:', {
    environment: process.env.NEXT_PUBLIC_ENV || 'development',
    url: API_BASE_URL,
  });
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

interface StrapiResponse<T> {
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

export async function apiClient<T>(
  endpoint: string,
  options?: RequestInit & { revalidate?: number }
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const { revalidate = 300, ...fetchOptions } = options || {};

  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_TOKEN}`,
      ...fetchOptions?.headers,
    },
    next: { revalidate },
  });

  if (!response.ok) {
    throw new ApiError(response.status, `API Error: ${response.statusText}`);
  }

  const json: StrapiResponse<T> | T = await response.json();

  // Handle Strapi's data wrapper
  if (json && typeof json === 'object' && 'data' in json) {
    return (json as StrapiResponse<T>).data;
  }

  return json as T;
}
