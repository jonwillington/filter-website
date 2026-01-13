import { MainLayout } from '@/components/layout/MainLayout';
import { getAllLocations, getLocationBySlug, getCityAreaBySlug, getAllCityAreas } from '@/lib/api/locations';
import { getAllShops } from '@/lib/api/shops';
import { getAllCountries } from '@/lib/api/countries';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { deslugify, slugify, getMediaUrl } from '@/lib/utils';

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

  // Fetch city area data for rich metadata
  const cityArea = await getCityAreaBySlug(area, city);
  const location = await getLocationBySlug(city);

  // Use CityArea description/summary if available
  const description = cityArea?.description || cityArea?.summary
    ? `${cityArea.description || cityArea.summary}`
    : `Find specialty coffee in ${areaName}, ${cityName}. Browse local cafes, roasters, and coffee spots.`;

  const ogDescription = cityArea?.summary || cityArea?.description || `Specialty coffee in ${areaName}, ${cityName}`;
  const imageUrl = getMediaUrl(cityArea?.featuredImage) || getMediaUrl(location?.background_image);

  return {
    title: `Coffee Shops in ${areaName}, ${cityName} | Filter`,
    description,
    openGraph: {
      title: `Coffee in ${areaName}, ${cityName} | Filter`,
      description: ogDescription,
      images: imageUrl ? [imageUrl] : [],
    },
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
  const cityAreas = await getAllCityAreas();

  return (
    <MainLayout
      locations={locations}
      initialLocation={location}
      shops={allShops}
      countries={countries}
      cityAreas={cityAreas}
    />
  );
}
