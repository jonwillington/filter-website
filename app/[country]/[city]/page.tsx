import { MainLayout } from '@/components/layout/MainLayout';
import { getAllLocations, getLocationBySlug } from '@/lib/api/locations';
import { getShopsByLocation } from '@/lib/api/shops';
import { getAllCountries } from '@/lib/api/countries';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { slugify } from '@/lib/utils';

export const dynamicParams = false;

interface CityPageProps {
  params: Promise<{ country: string; city: string }>;
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { city } = await params;
  const location = await getLocationBySlug(city);

  if (!location) {
    return { title: 'City Not Found | Filter' };
  }

  return {
    title: `Coffee Shops in ${location.name}, ${location.country?.name || ''} | Filter`,
    description: `Discover the best specialty coffee shops in ${location.name}. Browse cafes, see reviews, and find your next favorite coffee spot.`,
    openGraph: {
      title: `Coffee Shops in ${location.name} | Filter`,
      description: `Discover specialty coffee in ${location.name}`,
      images: location.background_image?.url ? [location.background_image.url] : [],
    },
  };
}

export async function generateStaticParams() {
  try {
    const locations = await getAllLocations();
    return locations
      .filter(location => location.country?.name)
      .map((location) => ({
        country: slugify(location.country!.name),
        city: slugify(location.name),
      }));
  } catch (error) {
    console.error('Error in generateStaticParams for city:', error);
    return [];
  }
}

export default async function CityPage({ params }: CityPageProps) {
  const { country, city } = await params;
  const locations = await getAllLocations();
  const location = await getLocationBySlug(city);

  if (!location || !location.country) {
    notFound();
  }

  // Validate country matches
  if (slugify(location.country.name) !== country) {
    notFound();
  }

  const shops = await getShopsByLocation(location.documentId);
  const countries = await getAllCountries();

  return (
    <MainLayout
      locations={locations}
      initialLocation={location}
      shops={shops}
      countries={countries}
    />
  );
}
