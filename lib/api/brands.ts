import { apiClient } from './client';

export interface Brand {
  id: number;
  documentId: string;
  name: string;
  type?: string;
  description?: string;
  story?: string;
  website?: string;
  phone?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  has_wifi?: boolean;
  has_food?: boolean;
  has_outdoor_space?: boolean;
  is_pet_friendly?: boolean;
  has_espresso?: boolean;
  has_filter_coffee?: boolean;
  has_v60?: boolean;
  has_chemex?: boolean;
  has_aeropress?: boolean;
  has_french_press?: boolean;
  has_cold_brew?: boolean;
  has_batch_brew?: boolean;
  roastOwnBeans?: boolean;
  ownRoastDesc?: string;
  logo?: any;
  suppliers?: any[];
  coffee_partner?: any;
}

export interface ApiResponse<T> {
  data: T;
  meta?: any;
}

export async function getBrandById(documentId: string): Promise<Brand | null> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_STRAPI_URL || 'https://helpful-oasis-8bb949e05d.strapiapp.com/api'}/brands/${documentId}?populate=*`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_STRAPI_TOKEN}`,
        },
        next: { revalidate: 300 },
      }
    );

    if (!response.ok) {
      console.error(`Failed to fetch brand ${documentId}:`, response.statusText);
      return null;
    }

    const json: ApiResponse<Brand> = await response.json();
    return json.data;
  } catch (error) {
    console.error(`Error fetching brand ${documentId}:`, error);
    return null;
  }
}
