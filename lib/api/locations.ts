import { Location, Shop } from '../types';
import { deslugify } from '../utils';
import { getAllShops } from './shops';

export interface ApiResponse<T> {
  data: T;
  meta?: any;
}

// Fetch a single location directly from API with all fields
export async function fetchLocationById(documentId: string): Promise<Location | null> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_STRAPI_URL || 'https://helpful-oasis-8bb949e05d.strapiapp.com/api'}/locations/${documentId}?populate=*`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_STRAPI_TOKEN}`,
        },
        next: { revalidate: 300 },
      }
    );

    if (!response.ok) {
      console.error(`Failed to fetch location ${documentId}:`, response.statusText);
      return null;
    }

    const json: ApiResponse<Location> = await response.json();
    return json.data;
  } catch (error) {
    console.error(`Error fetching location ${documentId}:`, error);
    return null;
  }
}

// Extract unique locations from shops data (reuses shops cache)
// This preserves all location fields including country and background_image
// Note: shops.ts enriches location data with full country info from separate API calls
export async function getAllLocations(): Promise<Location[]> {
  try {
    const shops = await getAllShops();

    if (!Array.isArray(shops)) return [];

    const locationMap = new Map<string, Location>();

    for (const shop of shops) {
      // Check direct location (already enriched with full country data)
      const loc = shop.location;
      if (loc?.documentId && !locationMap.has(loc.documentId)) {
        locationMap.set(loc.documentId, {
          id: loc.id,
          documentId: loc.documentId,
          name: loc.name,
          slug: loc.slug,
          rating: loc.rating,
          rating_stars: loc.rating_stars,
          story: loc.story,
          headline: loc.headline,
          inFocus: loc.inFocus,
          background_image: loc.background_image,
          country: loc.country, // Already enriched with full country data
          coordinates: loc.coordinates,
        } as Location);
      }

      // Also check city_area's location (also enriched with full data)
      const cityArea = shop.city_area ?? shop.cityArea;
      const areaLoc = cityArea?.location as Location | undefined;
      if (areaLoc?.documentId && !locationMap.has(areaLoc.documentId)) {
        locationMap.set(areaLoc.documentId, {
          id: areaLoc.id,
          documentId: areaLoc.documentId,
          name: areaLoc.name,
          slug: areaLoc.slug,
          rating: areaLoc.rating,
          rating_stars: areaLoc.rating_stars,
          story: areaLoc.story,
          headline: areaLoc.headline,
          inFocus: areaLoc.inFocus,
          background_image: areaLoc.background_image,
          country: areaLoc.country, // Already enriched with full country data
          coordinates: areaLoc.coordinates,
        } as Location);
      }
    }

    return Array.from(locationMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  } catch (error) {
    console.error('Failed to fetch locations:', error);
    return [];
  }
}

export async function getLocationBySlug(slug: string): Promise<Location | null> {
  try {
    const locations = await getAllLocations();
    const nameSearch = deslugify(slug).toLowerCase();

    return (
      locations.find(
        (loc) =>
          loc.name.toLowerCase() === nameSearch ||
          loc.name.toLowerCase().includes(nameSearch)
      ) ?? null
    );
  } catch (error) {
    console.error('Failed to fetch location:', error);
    return null;
  }
}

export async function getLocationById(documentId: string): Promise<Location | null> {
  try {
    const locations = await getAllLocations();
    return locations.find((loc) => loc.documentId === documentId) ?? null;
  } catch (error) {
    console.error('Failed to fetch location:', error);
    return null;
  }
}
