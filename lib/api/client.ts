const API_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://helpful-oasis-8bb949e05d.strapiapp.com/api';
const API_TOKEN = process.env.NEXT_PUBLIC_STRAPI_TOKEN;

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
