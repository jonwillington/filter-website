'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useMemo, useRef } from 'react';
import { Shop, Location, Country, CityArea, Event, Critic } from '@/lib/types';

interface ShopDataContextType {
  shops: Shop[];
  locations: Location[];
  countries: Country[];
  cityAreas: CityArea[];
  events: Event[];
  critics: Critic[];
  isHydrated: boolean;
  hydrate: (data: HydrateData) => void;
}

interface HydrateData {
  shops?: Shop[];
  locations?: Location[];
  countries?: Country[];
  cityAreas?: CityArea[];
  events?: Event[];
  critics?: Critic[];
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
  const [critics, setCritics] = useState<Critic[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Track hydration to prevent unnecessary updates
  const hydrationCountRef = useRef(0);

  const hydrate = useCallback((data: HydrateData) => {
    // Only hydrate if we have more/better data than current
    let shouldUpdate = false;

    if (data.shops && data.shops.length > 0) {
      // Always update if we have no data, or if new data is larger
      if (shops.length === 0 || (data.shops.length > shops.length && hydrationCountRef.current === 0)) {
        setShops(data.shops);
        shouldUpdate = true;
      }
    }

    if (data.locations && data.locations.length > 0) {
      if (locations.length === 0 || (data.locations.length > locations.length && hydrationCountRef.current === 0)) {
        setLocations(data.locations);
        shouldUpdate = true;
      }
    }

    if (data.countries && data.countries.length > 0) {
      if (countries.length === 0 || (data.countries.length > countries.length && hydrationCountRef.current === 0)) {
        setCountries(data.countries);
        shouldUpdate = true;
      }
    }

    if (data.cityAreas && data.cityAreas.length > 0) {
      if (cityAreas.length === 0 || (data.cityAreas.length > cityAreas.length && hydrationCountRef.current === 0)) {
        setCityAreas(data.cityAreas);
        shouldUpdate = true;
      }
    }

    if (data.events && data.events.length > 0) {
      if (events.length === 0 || (data.events.length > events.length && hydrationCountRef.current === 0)) {
        setEvents(data.events);
        shouldUpdate = true;
      }
    }

    if (data.critics && data.critics.length > 0) {
      if (critics.length === 0 || (data.critics.length > critics.length && hydrationCountRef.current === 0)) {
        setCritics(data.critics);
        shouldUpdate = true;
      }
    }

    if (shouldUpdate || hydrationCountRef.current === 0) {
      hydrationCountRef.current += 1;
      if (!isHydrated) {
        setIsHydrated(true);
      }
    }
  }, [shops.length, locations.length, countries.length, cityAreas.length, events.length, critics.length, isHydrated]);

  const value = useMemo(() => ({
    shops,
    locations,
    countries,
    cityAreas,
    events,
    critics,
    isHydrated,
    hydrate,
  }), [shops, locations, countries, cityAreas, events, critics, isHydrated, hydrate]);

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
