'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useMemo, useRef } from 'react';
import { Shop, Location, Country, CityArea, Event, Person, NewsArticle } from '@/lib/types';

interface ShopDataContextType {
  shops: Shop[];
  locations: Location[];
  countries: Country[];
  cityAreas: CityArea[];
  events: Event[];
  people: Person[];
  newsArticles: NewsArticle[];
  isHydrated: boolean;
  hydrate: (data: HydrateData) => void;
}

interface HydrateData {
  shops?: Shop[];
  locations?: Location[];
  countries?: Country[];
  cityAreas?: CityArea[];
  events?: Event[];
  people?: Person[];
  newsArticles?: NewsArticle[];
}

const ShopDataContext = createContext<ShopDataContextType | null>(null);

/**
 * ShopDataProvider maintains a stable reference to shop data across navigations.
 *
 * The provider starts empty and is hydrated by MainLayout with server-side data.
 * Once hydrated, the data reference stays stable across navigations, preventing
 * unnecessary map marker recreation.
 */
export function ShopDataProvider({ children }: { children: ReactNode }) {
  const [shops, setShops] = useState<Shop[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [cityAreas, setCityAreas] = useState<CityArea[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Track hydration to prevent unnecessary updates
  const hydrationCountRef = useRef(0);

  const hydrate = useCallback((data: HydrateData) => {
    // Only hydrate once - use ref to track without causing re-renders
    if (hydrationCountRef.current > 0) {
      return;
    }

    hydrationCountRef.current = 1;

    if (data.shops && data.shops.length > 0) {
      setShops(data.shops);
    }
    if (data.locations && data.locations.length > 0) {
      setLocations(data.locations);
    }
    if (data.countries && data.countries.length > 0) {
      setCountries(data.countries);
    }
    if (data.cityAreas && data.cityAreas.length > 0) {
      setCityAreas(data.cityAreas);
    }
    if (data.events && data.events.length > 0) {
      setEvents(data.events);
    }
    if (data.people && data.people.length > 0) {
      setPeople(data.people);
    }
    if (data.newsArticles && data.newsArticles.length > 0) {
      setNewsArticles(data.newsArticles);
    }
    setIsHydrated(true);
  }, []);

  const value = useMemo(() => ({
    shops,
    locations,
    countries,
    cityAreas,
    events,
    people,
    newsArticles,
    isHydrated,
    hydrate,
  }), [shops, locations, countries, cityAreas, events, people, newsArticles, isHydrated, hydrate]);

  return (
    <ShopDataContext.Provider value={value}>
      {children}
    </ShopDataContext.Provider>
  );
}

export function useShopData(): ShopDataContextType {
  const context = useContext(ShopDataContext);
  if (!context) {
    throw new Error('useShopData must be used within a ShopDataProvider');
  }
  return context;
}
