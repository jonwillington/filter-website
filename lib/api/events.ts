import { Event, Brand } from '../types';
import { getCached, setCache } from './cache';
import { getAllBrands } from './brands';
import { strapiGetAll } from './strapiClient';

// Populate params for events
const EVENT_POPULATE = [
  'populate[image][fields][0]=url',
  'populate[image][fields][1]=formats',
  'populate[eventHostBrand][fields][0]=id',
  'populate[eventHostBrand][fields][1]=documentId',
  'populate[eventHostBrand][fields][2]=name',
  'populate[eventHostBrand][fields][3]=website',
  'populate[eventHostBrand][fields][4]=instagram',
  'populate[eventHostBrand][fields][5]=description',
  'populate[eventHostBrand][populate][logo][fields][0]=url',
  'populate[eventHostBrand][populate][logo][fields][1]=formats',
  'populate[city][fields][0]=id',
  'populate[city][fields][1]=documentId',
  'populate[city][fields][2]=name',
  'populate[city][fields][3]=slug',
].join('&');

export async function getAllEvents(): Promise<Event[]> {
  const cacheKey = 'events:all';
  const cached = getCached<Event[]>(cacheKey);
  if (cached) return cached;

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
