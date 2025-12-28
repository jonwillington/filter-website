import { MainLayout } from '@/components/layout/MainLayout';
import { getAllLocations, getLocationBySlug } from '@/lib/api/locations';
import { getShopsByLocation, getShopBySlug, getAllShops } from '@/lib/api/shops';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { slugify, getMediaUrl } from '@/lib/utils';

export const revalidate = 300;

interface ShopPageProps {
  params: Promise<{ city: string; area: string; shop: string }>;
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

export async function generateStaticParams() {
  const shops = await getAllShops();

  return shops
    .filter(
      (shop) =>
        shop.location?.name &&
        (shop.city_area?.name || shop.cityArea?.name) &&
        shop.slug
    )
    .map((shop) => ({
      city: slugify(shop.location!.name),
      area: slugify(shop.city_area?.name ?? shop.cityArea?.name ?? ''),
      shop: shop.slug!,
    }));
}

export default async function ShopPage({ params }: ShopPageProps) {
  const { city, shop: shopSlug } = await params;
  const locations = await getAllLocations();
  const location = await getLocationBySlug(city);
  const shop = await getShopBySlug(shopSlug);

  if (!location || !shop) {
    notFound();
  }

  const shops = await getShopsByLocation(location.documentId);

  return (
    <MainLayout
      locations={locations}
      initialLocation={location}
      shops={shops}
      initialShop={shop}
    />
  );
}
