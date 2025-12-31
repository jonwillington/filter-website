import { Location, Shop, CityArea } from '../types';
import { deslugify } from '../utils';
import { getAllShops } from './shops';
import { getCached, setCache } from './cache';

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

// Fetch unique locations from both city-areas and shops
// This ensures all locations with shops are available in the selector
export async function getAllLocations(): Promise<Location[]> {
  const cacheKey = 'locations:all';
  const cached = getCached<Location[]>(cacheKey);
  if (cached) return cached;

  try {
    const locationMap = new Map<string, Location>();

    // 1. Get locations from city-areas (with full nested data)
    const cityAreas = await getAllCityAreas();
    for (const cityArea of cityAreas) {
      const loc = cityArea.location;
      if (loc?.documentId && !locationMap.has(loc.documentId)) {
        locationMap.set(loc.documentId, loc as Location);
      }
    }

    // 2. Also get locations directly from shops (in case some don't have city-areas)
    const shops = await getAllShops();
    for (const shop of shops) {
      // Check direct location reference
      if (shop.location?.documentId && !locationMap.has(shop.location.documentId)) {
        locationMap.set(shop.location.documentId, shop.location as Location);
      }
      // Check location via city_area
      if (shop.city_area?.location?.documentId && !locationMap.has(shop.city_area.location.documentId)) {
        locationMap.set(shop.city_area.location.documentId, shop.city_area.location as Location);
      }
    }

    const locations = Array.from(locationMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    setCache(cacheKey, locations);
    return locations;
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

export async function getAllCityAreas(): Promise<CityArea[]> {
  const cacheKey = 'cityAreas:all';
  const cached = getCached<CityArea[]>(cacheKey);
  if (cached) return cached;

  try {
    const cityAreas: CityArea[] = [];
    let page = 1;
    let pageCount = 1;

    while (page <= pageCount) {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_URL || 'https://helpful-oasis-8bb949e05d.strapiapp.com/api'}/city-areas?populate[location]=*&populate[location][populate][country]=*&populate[location][populate][background_image]=*&pagination[pageSize]=100&pagination[page]=${page}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_STRAPI_TOKEN}`,
          },
          next: { revalidate: 300 },
        }
      );

      if (!response.ok) {
        console.error(`City Areas API Error: ${response.statusText}`);
        break;
      }

      const json = await response.json();
      cityAreas.push(...(json.data || []));

      pageCount = json.meta?.pagination?.pageCount || 1;
      page++;
    }

    setCache(cacheKey, cityAreas);
    return cityAreas;
  } catch (error) {
    console.error('Failed to fetch city areas:', error);
    return [];
  }
}

export async function getCityAreaBySlug(slug: string, citySlug: string): Promise<CityArea | null> {
  try {
    const cityAreas = await getAllCityAreas();
    const areaName = deslugify(slug).toLowerCase();
    const cityName = deslugify(citySlug).toLowerCase();

    return (
      cityAreas.find(
        (area) =>
          area.name.toLowerCase() === areaName &&
          area.location?.name?.toLowerCase() === cityName
      ) ?? null
    );
  } catch (error) {
    console.error('Failed to fetch city area:', error);
    return null;
  }
}
