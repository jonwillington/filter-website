import { UserImage } from '../types';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://helpful-oasis-8bb949e05d.strapiapp.com/api';
const STRAPI_TOKEN = process.env.NEXT_PUBLIC_STRAPI_TOKEN;

export async function getUserImagesByShop(shopDocumentId: string): Promise<UserImage[]> {
  if (!shopDocumentId) return [];

  try {
    const response = await fetch(
      `${STRAPI_URL}/user-images?filters[shop][documentId][$eq]=${shopDocumentId}&filters[approved][$eq]=true&populate=*`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${STRAPI_TOKEN}`,
        },
        next: { revalidate: 60 },
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch user images:', response.statusText);
      return [];
    }

    const json = await response.json();
    return json.data || [];
  } catch (error) {
    console.error('Error fetching user images:', error);
    return [];
  }
}
