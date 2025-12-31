import { Location, Shop, CityArea } from '../types';
import { deslugify } from '../utils';
import { getAllShops } from './shops';

export interface ApiResponse<T> {
  data: T;
  meta?: any;
}

// Cache for locations
let locationsCache: Location[] | null = null;
let locationsCacheTimestamp = 0;
const LOCATIONS_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Cache for city areas
let cityAreasCache: CityArea[] | null = null;
let cityAreasCacheTimestamp = 0;
const CITY_AREAS_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Force cache invalidation on module reload (server-side)
if (typeof window === 'undefined') {
  locationsCache = null;
  locationsCacheTimestamp = 0;
  cityAreasCache = null;
  cityAreasCacheTimestamp = 0;
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
  const now = Date.now();

  // Return cached data if valid
  if (locationsCache && now - locationsCacheTimestamp < LOCATIONS_CACHE_TTL) {
    return locationsCache;
  }

  try {
    const locationMap = new Map<string, Location>();

    // 1. Get locations from city-areas (with full nested data)
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
      const cityAreas = json.data || [];

      for (const cityArea of cityAreas) {
        const loc = cityArea.location;
        if (loc?.documentId && !locationMap.has(loc.documentId)) {
          locationMap.set(loc.documentId, loc as Location);
        }
      }

      pageCount = json.meta?.pagination?.pageCount || 1;
      page++;
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

    locationsCache = locations;
    locationsCacheTimestamp = now;
    return locations;
  } catch (error) {
    console.error('Failed to fetch locations:', error);
    return locationsCache ?? [];
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
  const now = Date.now();

  // Return cached data if valid
  if (cityAreasCache && now - cityAreasCacheTimestamp < CITY_AREAS_CACHE_TTL) {
    return cityAreasCache;
  }

  try {
    const cityAreas: CityArea[] = [];
    let page = 1;
    let pageCount = 1;

    while (page <= pageCount) {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_URL || 'https://helpful-oasis-8bb949e05d.strapiapp.com/api'}/city-areas?populate=*&pagination[pageSize]=100&pagination[page]=${page}`,
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

    cityAreasCache = cityAreas;
    cityAreasCacheTimestamp = now;
    return cityAreas;
  } catch (error) {
    console.error('Failed to fetch city areas:', error);
    return cityAreasCache ?? [];
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
