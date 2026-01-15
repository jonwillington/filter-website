import { MainLayout } from '@/components/layout/MainLayout';
import { getAllLocations, getLocationBySlug, getAllCityAreas } from '@/lib/api/locations';
import { getShopBySlug, getAllShops } from '@/lib/api/shops';
import { getAllCountries } from '@/lib/api/countries';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { slugify, getMediaUrl } from '@/lib/utils';

// Cache pages for 5 minutes, then revalidate in background
export const revalidate = 300;

// Pre-render all shop pages at build time
export async function generateStaticParams() {
  const allShops = await getAllShops();

  return allShops
    .filter((shop) => {
      // Need location with country, and city_area for the area segment
      const location = shop.location;
      const cityArea = shop.city_area || shop.cityArea;
      return location?.country?.name && location?.name && cityArea?.name;
    })
    .map((shop) => {
      const location = shop.location!;
      const cityArea = (shop.city_area || shop.cityArea)!;
      return {
        country: slugify(location.country!.name),
        city: location.slug || slugify(location.name),
        area: slugify(cityArea.name),
        shop: shop.slug || slugify(shop.name),
      };
    });
}

interface ShopPageProps {
  params: Promise<{ country: string; city: string; area: string; shop: string }>;
}

export async function generateMetadata({ params }: ShopPageProps): Promise<Metadata> {
  const { shop: shopSlug } = await params;
  const shop = await getShopBySlug(shopSlug);

  if (!shop) {
    return { title: 'Shop Not Found | Filter' };
  }

  const areaName = shop.city_area?.name ?? shop.cityArea?.name ?? '';
  const cityName = shop.location?.name ?? '';
  const countryName = shop.location?.country?.name ?? '';
  const imageUrl = getMediaUrl(shop.featured_image);

  // Build rich description from available data
  const ratingText = shop.google_rating ? `★ ${shop.google_rating}` : '';
  const reviewText = shop.google_review_count ? ` (${shop.google_review_count} reviews)` : '';
  const ratingInfo = ratingText ? ` ${ratingText}${reviewText}.` : '';

  // Collect amenities for description
  const amenities: string[] = [];
  if (shop.has_wifi) amenities.push('WiFi');
  if (shop.has_food || shop.has_kitchen) amenities.push('Food');
  if (shop.has_outdoor_space) amenities.push('Outdoor seating');
  if (shop.is_pet_friendly) amenities.push('Pet friendly');
  const amenitiesText = amenities.length > 0 ? ` Offers: ${amenities.join(', ')}.` : '';

  // Collect brew methods
  const brewMethods: string[] = [];
  if (shop.has_espresso) brewMethods.push('espresso');
  if (shop.has_filter_coffee) brewMethods.push('filter');
  if (shop.has_v60) brewMethods.push('V60');
  if (shop.has_cold_brew) brewMethods.push('cold brew');
  const brewText = brewMethods.length > 0 ? ` Brew methods: ${brewMethods.join(', ')}.` : '';

  // Use shop description, brand story, or brand description
  const storyContent = shop.description || shop.brand?.story || shop.brand?.description;
  const baseDescription = storyContent
    ? `${storyContent}`
    : `Visit ${shop.name} for specialty coffee in ${areaName}, ${cityName}.`;

  const description = `${baseDescription}${ratingInfo}${amenitiesText}${brewText} ${shop.address ?? ''}`.trim();

  const ogDescription = shop.description || shop.brand?.description || `Specialty coffee at ${shop.name} in ${areaName}, ${cityName}`;

  return {
    title: `${shop.name} - ${areaName}, ${cityName} | Filter Coffee`,
    description,
    openGraph: {
      title: `${shop.name} | Filter Coffee`,
      description: ogDescription,
      images: imageUrl ? [imageUrl] : [],
    },
    other: {
      'geo.placename': `${areaName}, ${cityName}, ${countryName}`,
      ...(shop.coordinates?.lat && { 'geo.position': `${shop.coordinates.lat};${shop.coordinates.lng}` }),
    },
  };
}

export default async function ShopPage({ params }: ShopPageProps) {
  const { country, city, shop: shopSlug } = await params;
  const locations = await getAllLocations();
  const location = await getLocationBySlug(city);
  const shop = await getShopBySlug(shopSlug);

  if (!location || !shop || !location.country) {
    notFound();
  }

  // Validate country matches
  if (slugify(location.country.name) !== country) {
    notFound();
  }

  const allShops = await getAllShops();
  const countries = await getAllCountries();
  const cityAreas = await getAllCityAreas();

  const areaName = shop.city_area?.name ?? shop.cityArea?.name ?? '';
  const cityName = shop.location?.name ?? '';
  const countryName = shop.location?.country?.name ?? '';
  const imageUrl = getMediaUrl(shop.featured_image);

  // Build amenities list for schema
  const amenityFeatures: string[] = [];
  if (shop.has_wifi) amenityFeatures.push('Free WiFi');
  if (shop.has_food || shop.has_kitchen) amenityFeatures.push('Food Menu');
  if (shop.has_outdoor_space) amenityFeatures.push('Outdoor Seating');
  if (shop.is_pet_friendly) amenityFeatures.push('Pet Friendly');

  // JSON-LD structured data for the shop
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CafeOrCoffeeShop',
    name: shop.name,
    description: shop.description || shop.brand?.description || `Specialty coffee shop in ${areaName}, ${cityName}`,
    image: imageUrl || undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: shop.address,
      addressLocality: cityName,
      addressRegion: areaName,
      addressCountry: countryName,
    },
    ...(shop.coordinates?.lat && shop.coordinates?.lng && {
      geo: {
        '@type': 'GeoCoordinates',
        latitude: shop.coordinates.lat,
        longitude: shop.coordinates.lng,
      },
    }),
    ...(shop.google_rating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: shop.google_rating,
        bestRating: 5,
        reviewCount: shop.google_review_count || 0,
      },
    }),
    ...((shop.phone || shop.phone_number) && {
      telephone: shop.phone || shop.phone_number,
    }),
    ...((shop.website || shop.brand?.website) && {
      url: shop.website || shop.brand?.website,
    }),
    ...(amenityFeatures.length > 0 && {
      amenityFeature: amenityFeatures.map(feature => ({
        '@type': 'LocationFeatureSpecification',
        name: feature,
        value: true,
      })),
    }),
    servesCuisine: 'Coffee',
    priceRange: '$$',
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
        initialShop={shop}
        countries={countries}
        cityAreas={cityAreas}
      />
    </>
  );
}
