import { Bean } from '@/lib/types';

export interface ApiResponse<T> {
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

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://helpful-oasis-8bb949e05d.strapiapp.com/api';
const STRAPI_TOKEN = process.env.NEXT_PUBLIC_STRAPI_TOKEN;

/**
 * Fetch all beans for a specific brand by documentId
 */
export async function getBeansByBrand(brandDocumentId: string): Promise<Bean[]> {
  if (!brandDocumentId) return [];

  try {
    const populateParams = [
      // Populate origins (countries)
      'populate[origins][fields][0]=id',
      'populate[origins][fields][1]=documentId',
      'populate[origins][fields][2]=name',
      'populate[origins][fields][3]=code',
      // Populate flavor tags
      'populate[flavorTags][fields][0]=id',
      'populate[flavorTags][fields][1]=documentId',
      'populate[flavorTags][fields][2]=name',
    ].join('&');

    const filterParams = `filters[brand][documentId][$eq]=${brandDocumentId}`;

    const response = await fetch(
      `${STRAPI_URL}/beans?${filterParams}&${populateParams}&pagination[pageSize]=100`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${STRAPI_TOKEN}`,
        },
        next: { revalidate: 300 },
      }
    );

    if (!response.ok) {
      console.error(`Failed to fetch beans for brand ${brandDocumentId}:`, response.statusText);
      return [];
    }

    const json: ApiResponse<Bean[]> = await response.json();
    return json.data || [];
  } catch (error) {
    console.error(`Error fetching beans for brand ${brandDocumentId}:`, error);
    return [];
  }
}
