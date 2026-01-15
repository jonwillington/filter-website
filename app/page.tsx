import { MainLayout } from '@/components/layout/MainLayout';
import { getAllLocations, getAllCityAreas } from '@/lib/api/locations';
import { getAllShops } from '@/lib/api/shops';
import { getAllCountries } from '@/lib/api/countries';

// Cache pages for 5 minutes, then revalidate in background
export const revalidate = 300;

export default async function HomePage() {
  // Fetch all data in parallel for faster build times
  const [locations, allShops, countries, cityAreas] = await Promise.all([
    getAllLocations(),
    getAllShops(),
    getAllCountries(),
    getAllCityAreas(),
  ]);

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
