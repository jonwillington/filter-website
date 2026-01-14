import { MainLayout } from '@/components/layout/MainLayout';
import { getAllLocations, getLocationBySlug, getAllCityAreas } from '@/lib/api/locations';
import { getAllShops } from '@/lib/api/shops';
import { getAllCountries } from '@/lib/api/countries';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { slugify } from '@/lib/utils';

// Cache pages for 5 minutes, then revalidate in background
export const revalidate = 300;

interface CityPageProps {
  params: Promise<{ country: string; city: string }>;
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { city } = await params;
  const location = await getLocationBySlug(city);

  if (!location) {
    return { title: 'City Not Found | Filter' };
  }

  const countryName = location.country?.name || '';
  const ratingText = location.rating_stars ? ` Rated ${location.rating_stars}★.` : '';

  // Use location story if available, otherwise generate a default description
  const description = location.story
    ? `${location.story}${ratingText}`
    : `Discover the best specialty coffee shops in ${location.name}, ${countryName}.${ratingText} Browse cafes, see reviews, and find your next favorite coffee spot.`;

  const ogDescription = location.headline || location.story || `Discover specialty coffee in ${location.name}`;

  return {
    title: `Coffee Shops in ${location.name}, ${countryName} | Filter`,
    description,
    openGraph: {
      title: `Coffee Shops in ${location.name} | Filter`,
      description: ogDescription,
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

  const allShops = await getAllShops();
  const countries = await getAllCountries();
  const cityAreas = await getAllCityAreas();

  // Count shops in this location
  const locationShops = allShops.filter(shop => shop.location?.documentId === location.documentId);

  // JSON-LD structured data for the city
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Coffee Shops in ${location.name}`,
    description: location.story || `Specialty coffee shops in ${location.name}, ${location.country?.name}`,
    numberOfItems: locationShops.length,
    itemListElement: locationShops.slice(0, 10).map((shop, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'CafeOrCoffeeShop',
        name: shop.name,
        address: shop.address,
        ...(shop.google_rating && {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: shop.google_rating,
            reviewCount: shop.google_review_count || 0,
          },
        }),
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MainLayout
        locations={locations}
        initialLocation={location}
        shops={allShops}
        countries={countries}
        cityAreas={cityAreas}
      />
    </>
  );
}
