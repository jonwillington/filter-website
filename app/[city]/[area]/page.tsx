import { MainLayout } from '@/components/layout/MainLayout';
import { getAllLocations, getLocationBySlug } from '@/lib/api/locations';
import { getShopsByLocation } from '@/lib/api/shops';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { deslugify } from '@/lib/utils';

export const revalidate = 300;

interface AreaPageProps {
  params: Promise<{ city: string; area: string }>;
}

export async function generateMetadata({ params }: AreaPageProps): Promise<Metadata> {
  const { city, area } = await params;
  const areaName = deslugify(area);
  const cityName = deslugify(city);

  return {
    title: `Coffee Shops in ${areaName}, ${cityName} | Filter`,
    description: `Find specialty coffee in ${areaName}, ${cityName}. Browse local cafes, roasters, and coffee spots.`,
  };
}

export default async function AreaPage({ params }: AreaPageProps) {
  const { city, area } = await params;
  const locations = await getAllLocations();
  const location = await getLocationBySlug(city);

  if (!location) {
    notFound();
  }

  const allShops = await getShopsByLocation(location.documentId);

  // Filter to just this area
  const areaName = deslugify(area).toLowerCase();
  const shops = allShops.filter((shop) => {
    const shopArea = (shop.city_area?.name ?? shop.cityArea?.name ?? '').toLowerCase();
    return shopArea === areaName || shopArea.includes(areaName) || areaName.includes(shopArea);
  });

  return (
    <MainLayout
      locations={locations}
      initialLocation={location}
      shops={shops.length > 0 ? shops : allShops}
    />
  );
}
