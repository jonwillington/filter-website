import { Person } from '../types';
import { strapiGetAll } from './strapiClient';
import { getCached, setCache, loadFromStaticFile } from './cache';

// Populate params to get all related data - simple syntax for Strapi v5
const PERSON_POPULATE = 'populate=photo&populate=locations&populate=person_picks.shop.featured_image&populate=person_picks.shop.brand.logo&populate=person_picks.shop.city_area';

/**
 * Fetch all people from Strapi
 */
export async function getAllPeople(): Promise<Person[]> {
  const cacheKey = 'people:all';
  const cached = getCached<Person[]>(cacheKey);
  if (cached) {
    console.log('[People API] Returning cached people:', cached.length);
    return cached;
  }

  // Try to load from static file first (prefetched data)
  const staticData = await loadFromStaticFile<Person[]>('people');
  if (staticData && staticData.length > 0) {
    console.log('[People API] Loaded from static file:', staticData.length);
    setCache(cacheKey, staticData);
    return staticData;
  }

  console.log('[People API] Fetching people from Strapi...');

  try {
    const people = await strapiGetAll<Person>(
      '/people',
      PERSON_POPULATE,
      { skipNextCache: true }
    );

    console.log('[People API] Fetched people:', people.length, people.map(p => p.name));

    // Sort person_picks by rank
    for (const person of people) {
      if (person.person_picks) {
        person.person_picks.sort((a, b) => {
          const rankA = a.rank ?? 99;
          const rankB = b.rank ?? 99;
          return rankA - rankB;
        });
      }
    }

    setCache(cacheKey, people);
    return people;
  } catch (error) {
    console.error('Failed to fetch people:', error);
    return [];
  }
}

/**
 * Get people that cover a specific location
 * @param locationDocumentId - The documentId of the location to filter by
 */
export async function getPeopleByLocation(locationDocumentId: string): Promise<Person[]> {
  const allPeople = await getAllPeople();

  return allPeople.filter((person) => {
    return person.locations?.some(
      (location) => location.documentId === locationDocumentId
    );
  });
}

/**
 * Get a single person by slug
 */
export async function getPersonBySlug(slug: string): Promise<Person | null> {
  const allPeople = await getAllPeople();
  return allPeople.find((person) => person.slug === slug) ?? null;
}
