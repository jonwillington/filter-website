import { MetadataRoute } from 'next';
import { getAllShops } from '@/lib/api/shops';
import { getAllLocations } from '@/lib/api/locations';
import { slugify } from '@/lib/utils';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://filter.coffee';

  const locations = await getAllLocations();
  const shops = await getAllShops();

  const locationUrls: MetadataRoute.Sitemap = locations.map((location) => ({
    url: `${baseUrl}/${slugify(location.name)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const shopUrls: MetadataRoute.Sitemap = shops
    .filter(
      (shop) =>
        shop.location?.name &&
        (shop.city_area?.name || shop.cityArea?.name) &&
        shop.slug
    )
    .map((shop) => ({
      url: `${baseUrl}/${slugify(shop.location!.name)}/${slugify(
        shop.city_area?.name ?? shop.cityArea?.name ?? ''
      )}/${shop.slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    ...locationUrls,
    ...shopUrls,
  ];
}
