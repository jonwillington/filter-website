import { MainLayout } from '@/components/layout/MainLayout';
import { getAllLocations, getLocationBySlug, getCityAreaBySlug, getAllCityAreas } from '@/lib/api/locations';
import { getAllShops } from '@/lib/api/shops';
import { getAllCountries } from '@/lib/api/countries';
import { getAllEvents } from '@/lib/api/events';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { deslugify, slugify, getMediaUrl } from '@/lib/utils';
import { withTimeout } from '@/lib/utils/timeout';

// Cache pages for 5 minutes, then revalidate in background
export const revalidate = 300;

// Pre-render all area pages at build time
export async function generateStaticParams() {
  const cityAreas = await getAllCityAreas();

  return cityAreas
    .filter((area) => area.location?.country?.name && area.location?.name)
    .map((area) => {
      const location = area.location!;
      const countryName = location.country!.name!;
      const citySlug = location.slug || slugify(location.name!);
      return {
        country: slugify(countryName),
        city: citySlug,
        area: area.slug || slugify(area.name),
      };
    });
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

  const [allShops, countries, allCityAreas, events] = await Promise.all([
    withTimeout(getAllShops(), 8000, []),
    withTimeout(getAllCountries(), 5000, []),
    withTimeout(getAllCityAreas(), 5000, []),
    withTimeout(getAllEvents(), 5000, []),
  ]);

  return (
    <MainLayout
      locations={locations}
      initialLocation={location}
      shops={allShops}
      countries={countries}
      cityAreas={allCityAreas}
      events={events}
    />
  );
}
