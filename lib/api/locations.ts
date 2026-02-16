import { Location, CityArea } from '../types';
import { deslugify } from '../utils';
import { getCached, setCache } from './cache';

// Fetch all locations — D1 is the source of truth
export async function getAllLocations(): Promise<Location[]> {
  const cacheKey = 'locations:all';
  const cached = getCached<Location[]>(cacheKey);
  if (cached) return cached;

  // D1 is the source of truth
  try {
    const { getAllLocationsD1 } = await import('./d1-queries');
    const d1Locations = await getAllLocationsD1();
    if (d1Locations && d1Locations.length > 0) {
      setCache(cacheKey, d1Locations);
      return d1Locations;
    }
  } catch {
    // D1 not available (build time, dev without D1)
  }

  return [];
}

export async function getLocationBySlug(slug: string): Promise<Location | null> {
  try {
    const locations = await getAllLocations();
    const nameSearch = deslugify(slug).toLowerCase();

    return (
      locations.find((loc) => loc.slug === slug) ??
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

  // D1 is the source of truth
  try {
    const { getAllCityAreasD1 } = await import('./d1-queries');
    const d1CityAreas = await getAllCityAreasD1();
    if (d1CityAreas && d1CityAreas.length > 0) {
      setCache(cacheKey, d1CityAreas);
      return d1CityAreas;
    }
  } catch {
    // D1 not available (build time, dev without D1)
  }

  return [];
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
