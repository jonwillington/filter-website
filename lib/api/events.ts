import { Event, Brand } from '../types';
import { getCached, setCache } from './cache';
import { getAllBrands } from './brands';

// Populate params for events - following the explicit field pattern from shops.ts
const EVENT_POPULATE = [
  // Event image
  'populate[image][fields][0]=url',
  'populate[image][fields][1]=formats',
  // Event host brand with all needed fields
  'populate[eventHostBrand][fields][0]=id',
  'populate[eventHostBrand][fields][1]=documentId',
  'populate[eventHostBrand][fields][2]=name',
  'populate[eventHostBrand][fields][3]=website',
  'populate[eventHostBrand][fields][4]=instagram',
  'populate[eventHostBrand][fields][5]=description',
  // Brand logo
  'populate[eventHostBrand][populate][logo][fields][0]=url',
  'populate[eventHostBrand][populate][logo][fields][1]=formats',
  // City (location) relation
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
    const allEvents: Event[] = [];
    let page = 1;
    let pageCount = 1;

    // Fetch all pages
    while (page <= pageCount) {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_URL || 'https://helpful-oasis-8bb949e05d.strapiapp.com/api'}/events?${EVENT_POPULATE}&pagination[pageSize]=100&pagination[page]=${page}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_STRAPI_TOKEN}`,
          },
          cache: 'no-store',
        }
      );

      if (!response.ok) {
        throw new Error(`Events API Error: ${response.statusText}`);
      }

      const json = await response.json();
      const data = json.data || [];
      allEvents.push(...data);

      pageCount = json.meta?.pagination?.pageCount || 1;
      page++;
    }

    // Enrich brand data from batch-fetched brands
    const brandMap = await getAllBrands();
    for (const event of allEvents) {
      if (event.eventHostBrand?.documentId) {
        const fullBrand = brandMap.get(event.eventHostBrand.documentId);
        if (fullBrand) {
          // Preserve the logo from the event populate if it exists
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
