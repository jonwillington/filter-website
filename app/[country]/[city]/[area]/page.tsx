import { MainLayout } from '@/components/layout/MainLayout';
import { getAllLocations, getLocationBySlug } from '@/lib/api/locations';
import { getAllShops } from '@/lib/api/shops';
import { getAllCountries } from '@/lib/api/countries';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { deslugify, slugify } from '@/lib/utils';

export const dynamicParams = false;

export async function generateStaticParams() {
  try {
    const shops = await getAllShops();

    const areaParams = new Map<string, { country: string; city: string; area: string }>();

    shops.forEach((shop) => {
      const countryName = shop.location?.country?.name;
      const cityName = shop.location?.name;
      // Use "All" as fallback area if shop has no city_area
      const areaName = shop.city_area?.name ?? shop.cityArea?.name ?? 'All';

      if (countryName && cityName && areaName) {
        const key = `${countryName}-${cityName}-${areaName}`;
        if (!areaParams.has(key)) {
          areaParams.set(key, {
            country: slugify(countryName),
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
  params: Promise<{ country: string; city: string; area: string }>;
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
  const { country, city, area } = await params;
  const locations = await getAllLocations();
  const location = await getLocationBySlug(city);

  if (!location || !location.country) {
    notFound();
  }

  // Validate country matches
  if (slugify(location.country.name) !== country) {
    notFound();
  }

  const allShops = await getAllShops();
  const countries = await getAllCountries();

  return (
    <MainLayout
      locations={locations}
      initialLocation={location}
      shops={allShops}
      countries={countries}
    />
  );
}
