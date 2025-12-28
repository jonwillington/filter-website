import { MainLayout } from '@/components/layout/MainLayout';
import { getAllLocations } from '@/lib/api/locations';
import { getAllShops } from '@/lib/api/shops';

export const revalidate = 300;

export default async function HomePage() {
  // Get locations (internally fetches shops and caches them)
  const locations = await getAllLocations();

  // Get all shops (uses cache from above call)
  const allShops = await getAllShops();

  // Default to Istanbul or first location
  const defaultLocation =
    locations.find((l) => l.name.toLowerCase() === 'istanbul') ??
    locations.find((l) => l.name.toLowerCase() === 'london') ??
    locations[0];

  // Filter shops for the default location
  const shops = defaultLocation
    ? allShops.filter(
        (shop) => shop.location?.documentId === defaultLocation.documentId
      )
    : allShops.slice(0, 50);

  return (
    <MainLayout
      locations={locations}
      initialLocation={defaultLocation}
      shops={shops}
    />
  );
}
