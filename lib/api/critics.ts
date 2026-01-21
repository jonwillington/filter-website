import { Critic } from '../types';
import { strapiGetAll } from './strapiClient';
import { getCached, setCache } from './cache';

// Populate params to get all related data
// Using deep populate syntax for nested relations
const CRITIC_POPULATE = [
  'populate[0]=photo',
  'populate[1]=locations',
  'populate[2]=critic_picks.shop.featured_image',
  'populate[3]=critic_picks.shop.brand.logo',
  'populate[4]=critic_picks.shop.city_area',
].join('&');

/**
 * Fetch all critics from Strapi
 */
export async function getAllCritics(): Promise<Critic[]> {
  const cacheKey = 'critics:all';
  const cached = getCached<Critic[]>(cacheKey);
  if (cached) {
    console.log('[Critics API] Returning cached critics:', cached.length);
    return cached;
  }

  console.log('[Critics API] Fetching critics from Strapi...');

  try {
    const critics = await strapiGetAll<Critic>(
      '/critics',
      CRITIC_POPULATE,
      { skipNextCache: true }
    );

    console.log('[Critics API] Fetched critics:', critics.length, critics.map(c => c.name));

    // Sort critic_picks by rank
    for (const critic of critics) {
      if (critic.critic_picks) {
        critic.critic_picks.sort((a, b) => {
          const rankA = a.rank ?? 99;
          const rankB = b.rank ?? 99;
          return rankA - rankB;
        });
      }
    }

    setCache(cacheKey, critics);
    return critics;
  } catch (error) {
    console.error('Failed to fetch critics:', error);
    return [];
  }
}

/**
 * Get critics that cover a specific location
 * @param locationDocumentId - The documentId of the location to filter by
 */
export async function getCriticsByLocation(locationDocumentId: string): Promise<Critic[]> {
  const allCritics = await getAllCritics();

  return allCritics.filter((critic) => {
    return critic.locations?.some(
      (location) => location.documentId === locationDocumentId
    );
  });
}

/**
 * Get a single critic by slug
 */
export async function getCriticBySlug(slug: string): Promise<Critic | null> {
  const allCritics = await getAllCritics();
  return allCritics.find((critic) => critic.slug === slug) ?? null;
}
