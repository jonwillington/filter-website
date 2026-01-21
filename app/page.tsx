import { MainLayout } from '@/components/layout/MainLayout';
import { getAllLocations, getAllCityAreas } from '@/lib/api/locations';
import { getAllShops } from '@/lib/api/shops';
import { getAllCountries } from '@/lib/api/countries';
import { getAllEvents } from '@/lib/api/events';

// Cache pages for 5 minutes, then revalidate in background
export const revalidate = 300;

export default async function HomePage() {
  // Fetch independent data in parallel first
  const [allShops, countries, cityAreas, events] = await Promise.all([
    getAllShops(),
    getAllCountries(),
    getAllCityAreas(),
    getAllEvents(),
  ]);

  // Then get locations, passing already-fetched data to avoid duplicate API calls
  const locations = await getAllLocations(allShops, cityAreas);

  // Start with no location selected - zoomed out world view
  return (
    <MainLayout
      locations={locations}
      initialLocation={null}
      shops={allShops}
      countries={countries}
      cityAreas={cityAreas}
      events={events}
    />
  );
}
