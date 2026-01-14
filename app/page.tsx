import { MainLayout } from '@/components/layout/MainLayout';
import { getAllLocations, getAllCityAreas } from '@/lib/api/locations';
import { getAllShops } from '@/lib/api/shops';
import { getAllCountries } from '@/lib/api/countries';

// Cache pages for 5 minutes, then revalidate in background
export const revalidate = 300;

export default async function HomePage() {
  // Get locations (internally fetches shops and caches them)
  const locations = await getAllLocations();

  // Get all shops (uses cache from above call)
  const allShops = await getAllShops();

  // Get all countries for map highlighting
  const countries = await getAllCountries();

  // Get all city areas with boundary coordinates for map visualization
  const cityAreas = await getAllCityAreas();

  // Start with no location selected - zoomed out world view
  return (
    <MainLayout
      locations={locations}
      initialLocation={null}
      shops={allShops}
      countries={countries}
      cityAreas={cityAreas}
    />
  );
}
