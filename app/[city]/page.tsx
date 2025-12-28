import { MainLayout } from '@/components/layout/MainLayout';
import { getAllLocations, getLocationBySlug } from '@/lib/api/locations';
import { getShopsByLocation } from '@/lib/api/shops';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { slugify } from '@/lib/utils';

export const dynamicParams = false;

interface CityPageProps {
  params: Promise<{ city: string }>;
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { city } = await params;
  const location = await getLocationBySlug(city);

  if (!location) {
    return { title: 'City Not Found | Filter' };
  }

  return {
    title: `Coffee Shops in ${location.name} | Filter`,
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
    return locations.map((location) => ({
      city: slugify(location.name),
    }));
  } catch (error) {
    console.error('Error in generateStaticParams for city:', error);
    return [];
  }
}

export default async function CityPage({ params }: CityPageProps) {
  const { city } = await params;
  const locations = await getAllLocations();
  const location = await getLocationBySlug(city);

  if (!location) {
    notFound();
  }

  const shops = await getShopsByLocation(location.documentId);

  return (
    <MainLayout
      locations={locations}
      initialLocation={location}
      shops={shops}
    />
  );
}
