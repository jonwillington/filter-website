import { MainLayout } from '@/components/layout/MainLayout';
import { getAllLocations, getLocationBySlug, getAllCityAreas } from '@/lib/api/locations';
import { getAllShops } from '@/lib/api/shops';
import { getAllEvents } from '@/lib/api/events';
import { getAllCountries } from '@/lib/api/countries';
import { getAllPeople } from '@/lib/api/people';
import { getAllNewsArticles } from '@/lib/api/news-articles';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { slugify } from '@/lib/utils';
import { getStoryText } from '@/lib/utils/storyBlocks';
import { withTimeout } from '@/lib/utils/timeout';

// Cache pages for 5 minutes, then revalidate in background
export const revalidate = 300;

// Pre-render all city pages at build time
export async function generateStaticParams() {
  const locations = await getAllLocations();

  return locations
    .filter((location) => location.country?.name) // Only locations with a country
    .map((location) => ({
      country: slugify(location.country!.name),
      city: location.slug || slugify(location.name),
    }));
}

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
  const storyText = getStoryText(location.story);
  const description = storyText
    ? `${storyText}${ratingText}`
    : `Discover the best specialty coffee shops in ${location.name}, ${countryName}.${ratingText} Browse cafes, see reviews, and find your next favorite coffee spot.`;

  const ogDescription = location.headline || storyText || `Discover specialty coffee in ${location.name}`;

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

  const [allShops, countries, allCityAreas, allEvents, allPeople, allNewsArticles] = await Promise.all([
    withTimeout(getAllShops(), 8000, []),
    withTimeout(getAllCountries(), 5000, []),
    withTimeout(getAllCityAreas(), 5000, []),
    withTimeout(getAllEvents(), 5000, []),
    withTimeout(getAllPeople(), 5000, []),
    withTimeout(getAllNewsArticles(), 5000, []),
  ]);

  return (
    <MainLayout
      locations={locations}
      initialLocation={location}
      shops={allShops}
      countries={countries}
      cityAreas={allCityAreas}
      events={allEvents}
      people={allPeople}
      newsArticles={allNewsArticles}
    />
  );
}
