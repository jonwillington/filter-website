import { MainLayout } from '@/components/layout/MainLayout';
import { getAllLocations, getLocationBySlug } from '@/lib/api/locations';
import { getShopsByLocation, getShopBySlug, getAllShops } from '@/lib/api/shops';
import { getAllCountries } from '@/lib/api/countries';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { slugify, getMediaUrl } from '@/lib/utils';

export const dynamicParams = false;

export async function generateStaticParams() {
  try {
    const shops = await getAllShops();

    return shops
      .map((shop) => {
        const countryName = shop.location?.country?.name;
        const cityName = shop.location?.name;
        // Use "All" as fallback area if shop has no city_area
        const areaName = shop.city_area?.name ?? shop.cityArea?.name ?? 'All';
        const shopSlug = shop.slug || slugify(shop.name);

        if (countryName && cityName && areaName) {
          return {
            country: slugify(countryName),
            city: slugify(cityName),
            area: slugify(areaName),
            shop: shopSlug,
          };
        }
        return null;
      })
      .filter((params): params is { country: string; city: string; area: string; shop: string } => params !== null);
  } catch (error) {
    console.error('Error in generateStaticParams for shop:', error);
    return [];
  }
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
  const imageUrl = getMediaUrl(shop.featured_image);

  return {
    title: `${shop.name} - ${areaName}, ${cityName} | Filter Coffee`,
    description:
      shop.brand?.description ??
      `Visit ${shop.name} for specialty coffee in ${areaName}, ${cityName}. ${shop.address ?? ''}`,
    openGraph: {
      title: `${shop.name} | Filter Coffee`,
      description: `Specialty coffee in ${areaName}, ${cityName}`,
      images: imageUrl ? [imageUrl] : [],
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

  const shops = await getShopsByLocation(location.documentId);
  const countries = await getAllCountries();

  return (
    <MainLayout
      locations={locations}
      initialLocation={location}
      shops={shops}
      initialShop={shop}
      countries={countries}
    />
  );
}
