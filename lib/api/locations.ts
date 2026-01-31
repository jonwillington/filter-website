import { Location, Shop, CityArea } from '../types';
import { deslugify } from '../utils';
import { getCached, setCache, getPrefetched } from './cache';

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

// Fetch all locations directly from Strapi (with static file fallback in dev mode)
async function fetchAllLocationsFromStrapi(): Promise<Location[]> {
  // In development, try static file first for faster/more reliable loading
  if (process.env.NODE_ENV === 'development') {
    const staticLocations = await getPrefetched<Location[]>('locations');
    if (staticLocations && staticLocations.length > 0) {
      return staticLocations;
    }
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://helpful-oasis-8bb949e05d.strapiapp.com/api';
    const fetchOptions = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_STRAPI_TOKEN}`,
      },
      next: { revalidate: 300 },
    };

    // Fetch first page to get total page count
    const firstResponse = await fetch(
      `${baseUrl}/locations?populate[country]=*&populate[background_image]=*&pagination[pageSize]=100&pagination[page]=1`,
      fetchOptions
    );

    if (!firstResponse.ok) {
      console.error(`Locations API Error: ${firstResponse.statusText}`);
      return [];
    }

    const firstJson = await firstResponse.json();
    const pageCount = firstJson.meta?.pagination?.pageCount || 1;
    const locations: Location[] = [...(firstJson.data || [])];

    // Fetch remaining pages in parallel
    if (pageCount > 1) {
      const pagePromises = [];
      for (let page = 2; page <= pageCount; page++) {
        pagePromises.push(
          fetch(
            `${baseUrl}/locations?populate[country]=*&populate[background_image]=*&pagination[pageSize]=100&pagination[page]=${page}`,
            fetchOptions
          ).then(res => res.ok ? res.json() : Promise.reject(new Error(`Page ${page} failed`)))
        );
      }

      const results = await Promise.all(pagePromises);
      for (const json of results) {
        locations.push(...(json.data || []));
      }
    }

    return locations;
  } catch (error) {
    console.error('Failed to fetch locations from Strapi:', error);
    return [];
  }
}

// Fetch unique locations from Strapi, city-areas, and shops
// This ensures all locations are available, including coming soon ones
// Pass shops and cityAreas to avoid duplicate fetching (they're already fetched in page.tsx)
export async function getAllLocations(shops?: Shop[], cityAreas?: CityArea[]): Promise<Location[]> {
  const cacheKey = 'locations:all';
  const cached = getCached<Location[]>(cacheKey);
  if (cached) return cached;

  try {
    const locationMap = new Map<string, Location>();

    // 1. Get all locations directly from Strapi (includes comingSoon locations)
    const strapiLocations = await fetchAllLocationsFromStrapi();
    for (const loc of strapiLocations) {
      if (loc.documentId) {
        locationMap.set(loc.documentId, loc);
      }
    }

    // 2. Get locations from city-areas (with full nested data) - may have more complete data
    // Use passed cityAreas if available to avoid duplicate fetch
    const cityAreasData = cityAreas ?? await getAllCityAreas();
    for (const cityArea of cityAreasData) {
      const loc = cityArea.location;
      if (loc?.documentId && !locationMap.has(loc.documentId)) {
        locationMap.set(loc.documentId, loc as Location);
      }
    }

    // 3. Also get locations directly from shops (in case some don't have city-areas)
    // Use passed shops if available to avoid duplicate fetch
    if (shops) {
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
    const baseUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://helpful-oasis-8bb949e05d.strapiapp.com/api';
    const populateParams = [
      'populate[location]=*',
      'populate[location][populate][country]=*',
      'populate[location][populate][background_image]=*',
    ].join('&');
    const fetchOptions = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_STRAPI_TOKEN}`,
      },
      next: { revalidate: 300 },
    };

    // Fetch first page to get total page count
    const firstResponse = await fetch(
      `${baseUrl}/city-areas?${populateParams}&pagination[pageSize]=100&pagination[page]=1`,
      fetchOptions
    );

    if (!firstResponse.ok) {
      console.error(`City Areas API Error: ${firstResponse.statusText}`);
      return [];
    }

    const firstJson = await firstResponse.json();
    const pageCount = firstJson.meta?.pagination?.pageCount || 1;
    const cityAreas: CityArea[] = [...(firstJson.data || [])];

    // Fetch remaining pages in parallel
    if (pageCount > 1) {
      const pagePromises = [];
      for (let page = 2; page <= pageCount; page++) {
        pagePromises.push(
          fetch(
            `${baseUrl}/city-areas?${populateParams}&pagination[pageSize]=100&pagination[page]=${page}`,
            fetchOptions
          ).then(res => res.ok ? res.json() : Promise.reject(new Error(`Page ${page} failed`)))
        );
      }

      const results = await Promise.all(pagePromises);
      for (const json of results) {
        cityAreas.push(...(json.data || []));
      }
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
