import { MainLayout } from '@/components/layout/MainLayout';
import { getAllLocations, getLocationBySlug } from '@/lib/api/locations';
import { getShopsByLocation, getAllShops } from '@/lib/api/shops';
import { getAllCountries } from '@/lib/api/countries';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { deslugify, slugify } from '@/lib/utils';

export const dynamicParams = false;

export async function generateStaticParams() {
  try {
    const shops = await getAllShops();

    const areaParams = new Map<string, { city: string; area: string }>();

    shops.forEach((shop) => {
      const cityName = shop.location?.name;
      const areaName = shop.city_area?.name ?? shop.cityArea?.name;

      if (cityName && areaName) {
        const key = `${cityName}-${areaName}`;
        if (!areaParams.has(key)) {
          areaParams.set(key, {
            city: slugify(cityName),
            area: slugify(areaName),
          });
        }
      }
    });

    return Array.from(areaParams.values());
  } catch (error) {
    console.error('Error in generateStaticParams for area:', error);
    return [];
  }
}

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
  const countries = await getAllCountries();

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
      countries={countries}
    />
  );
}
