import { Event, Brand } from '../types';
import { getCached, setCache, loadFromStaticFile } from './cache';
import { getAllBrands } from './brands';
import { strapiGetAll } from './strapiClient';

// Populate params for events - simple syntax for Strapi v5
const EVENT_POPULATE = 'populate=city&populate=image&populate=eventHostBrand.logo';

export async function getAllEvents(): Promise<Event[]> {
  const cacheKey = 'events:all';
  const cached = getCached<Event[]>(cacheKey);
  if (cached) return cached;

  // Try to load from static file first (prefetched data)
  const staticData = await loadFromStaticFile<Event[]>('events');
  if (staticData && staticData.length > 0) {
    console.log('[Events API] Loaded from static file:', staticData.length);
    setCache(cacheKey, staticData);
    return staticData;
  }

  try {
    // Use unified client for consistent fetching
    const allEvents = await strapiGetAll<Event>('/events', EVENT_POPULATE, {
      skipNextCache: true, // Large response
    });

    // Enrich brand data from batch-fetched brands
    const brandMap = await getAllBrands();
    for (const event of allEvents) {
      if (event.eventHostBrand?.documentId) {
        const fullBrand = brandMap.get(event.eventHostBrand.documentId);
        if (fullBrand) {
          const eventLogo = event.eventHostBrand.logo;
          event.eventHostBrand = {
            ...fullBrand,
            ...event.eventHostBrand,
            logo: eventLogo || fullBrand.logo,
          } as Brand;
        }
      }
    }

    setCache(cacheKey, allEvents);
    return allEvents;
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return [];
  }
}

export async function getEventsByLocation(locationDocumentId: string): Promise<Event[]> {
  try {
    const allEvents = await getAllEvents();
    const now = new Date();

    return allEvents
      .filter((event) => {
        // Filter by city/location
        if (event.city?.documentId !== locationDocumentId) {
          return false;
        }
        // Only include future events (start_date >= now)
        const startDate = new Date(event.start_date);
        return startDate >= now;
      })
      .sort((a, b) => {
        // Sort by start_date ascending (soonest first)
        return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
      });
  } catch (error) {
    console.error('Failed to fetch events by location:', error);
    return [];
  }
}

export async function getEventById(documentId: string): Promise<Event | null> {
  try {
    const allEvents = await getAllEvents();
    return allEvents.find((event) => event.documentId === documentId) ?? null;
  } catch (error) {
    console.error('Failed to fetch event:', error);
    return null;
  }
}
