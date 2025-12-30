import { MainLayout } from '@/components/layout/MainLayout';
import { getAllLocations } from '@/lib/api/locations';
import { getAllShops } from '@/lib/api/shops';

export default async function HomePage() {
  // Get locations (internally fetches shops and caches them)
  const locations = await getAllLocations();

  // Get all shops (uses cache from above call)
  const allShops = await getAllShops();

  // Start with no location selected - zoomed out world view
  return (
    <MainLayout
      locations={locations}
      initialLocation={null}
      shops={allShops}
    />
  );
}
