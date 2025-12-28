import { Location, Shop } from '../types';
import { deslugify } from '../utils';
import { getAllShops } from './shops';

// Extract unique locations from shops data (reuses shops cache)
export async function getAllLocations(): Promise<Location[]> {
  try {
    const shops = await getAllShops();

    if (!Array.isArray(shops)) return [];

    const locationMap = new Map<string, Location>();

    for (const shop of shops) {
      // Check direct location
      const loc = shop.location;
      if (loc?.documentId && !locationMap.has(loc.documentId)) {
        locationMap.set(loc.documentId, {
          id: loc.id,
          documentId: loc.documentId,
          name: loc.name,
          country: loc.country,
        } as Location);
      }

      // Also check city_area's location (for shops linked through neighborhoods)
      const cityArea = shop.city_area ?? shop.cityArea;
      const areaLoc = cityArea?.location;
      if (areaLoc?.documentId && !locationMap.has(areaLoc.documentId)) {
        locationMap.set(areaLoc.documentId, {
          id: areaLoc.id,
          documentId: areaLoc.documentId,
          name: areaLoc.name,
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
