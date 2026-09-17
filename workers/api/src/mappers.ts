import type {
  Amenities,
  Bean,
  BrandSummary,
  BrewMethods,
  CoffeePartner,
  Event,
  Menu,
  NewsArticle,
  Person,
  ShopSummary,
} from '../../../types/api-v3';
import { parseOpeningHours } from './hours';
import { bool, image, links, mediaObject, merged, num, parseJson, plainText, str, type Row } from './values';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Shop columns the summary needs. Brand defaults come from a separate query (D1 caps result columns at ~100). */
export const SHOP_SUMMARY_COLUMNS = [
  'document_id', 'name', 'slug', 'brand_document_id', 'location_document_id', 'city_area_document_id',
  'lat', 'lng', 'address', 'google_formatted_address',
  'featured_image_url', 'featured_image_formats', 'opening_hours',
  'has_wifi', 'has_food', 'has_kitchen', 'has_outdoor_space', 'is_pet_friendly',
  'has_espresso', 'has_filter_coffee', 'has_v60', 'has_chemex', 'has_aeropress', 'has_french_press',
  'has_cold_brew', 'has_batch_brew', 'has_slow_bar',
  'city_area_rec', 'city_area_rec_exp', 'working_rec', 'interior_rec', 'brewing_rec',
  'quality_tier', 'preference_profile', 'updated_at',
].join(', ');

export const BRAND_SUMMARY_COLUMNS = [
  'document_id', 'name', 'type', 'statement', 'logo_url', 'logo_formats', 'roast_own_beans',
  'has_wifi', 'has_food', 'has_outdoor_space', 'is_pet_friendly',
  'has_espresso', 'has_filter_coffee', 'has_v60', 'has_chemex', 'has_aeropress', 'has_french_press',
  'has_cold_brew', 'has_batch_brew', 'has_siphon', 'has_turkish_coffee', 'oat_milk', 'plant_milk',
].join(', ');

export function shopSummary(shop: Row, brand: Row | null): ShopSummary {
  const b = brand ?? {};
  const lat = num(shop.lat);
  const lng = num(shop.lng);

  const amenities: Amenities = {
    wifi: merged(bool(shop.has_wifi), bool(b.has_wifi)),
    food: merged(bool(shop.has_food) ?? bool(shop.has_kitchen), bool(b.has_food)),
    outdoorSeating: merged(bool(shop.has_outdoor_space), bool(b.has_outdoor_space)),
    petFriendly: merged(bool(shop.is_pet_friendly), bool(b.is_pet_friendly)),
    oatMilk: bool(b.oat_milk),
    plantMilk: bool(b.plant_milk),
  };

  const brewMethods: BrewMethods = {
    espresso: merged(bool(shop.has_espresso), bool(b.has_espresso)),
    filter: merged(bool(shop.has_filter_coffee), bool(b.has_filter_coffee)),
    v60: merged(bool(shop.has_v60), bool(b.has_v60)),
    chemex: merged(bool(shop.has_chemex), bool(b.has_chemex)),
    aeropress: merged(bool(shop.has_aeropress), bool(b.has_aeropress)),
    frenchPress: merged(bool(shop.has_french_press), bool(b.has_french_press)),
    coldBrew: merged(bool(shop.has_cold_brew), bool(b.has_cold_brew)),
    batchBrew: merged(bool(shop.has_batch_brew), bool(b.has_batch_brew)),
    siphon: bool(b.has_siphon),
    turkishCoffee: bool(b.has_turkish_coffee),
    slowBar: bool(shop.has_slow_bar),
  };

  return {
    id: shop.document_id,
    slug: str(shop.slug),
    name: str(shop.name)?.trim() ?? '',
    brandId: str(shop.brand_document_id),
    cityId: str(shop.location_document_id),
    cityAreaId: str(shop.city_area_document_id),
    coordinates: lat !== null && lng !== null ? { lat, lng } : null,
    address: str(shop.google_formatted_address) ?? str(shop.address),
    heroImage: image(shop.featured_image_url, shop.featured_image_formats),
    openingHours: parseOpeningHours(shop.opening_hours),
    amenities,
    brewMethods,
    recommendations: {
      cityArea: bool(shop.city_area_rec),
      cityAreaReason: str(shop.city_area_rec_exp),
      working: bool(shop.working_rec),
      interior: bool(shop.interior_rec),
      brewing: bool(shop.brewing_rec),
    },
    qualityTier: str(shop.quality_tier),
    preferenceProfile: parseJson(shop.preference_profile),
    updatedAt: str(shop.updated_at),
  };
}

export function brandSummary(brand: Row, supplierIds: string[]): BrandSummary {
  return {
    id: brand.document_id,
    name: str(brand.name)?.trim() ?? '',
    type: str(brand.type),
    statement: str(brand.statement),
    logo: image(brand.logo_url, brand.logo_formats),
    roastsOwnBeans: bool(brand.roast_own_beans),
    supplierIds,
  };
}

export function menus(value: unknown): Menu[] {
  const list = parseJson<any[]>(value);
  if (!Array.isArray(list)) return [];
  return list
    .filter(m => m && typeof m === 'object' && m.documentId)
    .map(m => ({
      id: m.documentId,
      image: mediaObject(m.menu_image),
      isCurrent: typeof m.is_current === 'boolean' ? m.is_current : null,
      validFrom: str(m.date_from),
      validTo: str(m.date_to),
      lastVerified: str(m.last_verified),
    }));
}

export function gallery(value: unknown) {
  const list = parseJson<any[]>(value);
  if (!Array.isArray(list)) return [];
  return list.map(mediaObject).filter((img): img is NonNullable<typeof img> => img !== null);
}

export function coffeePartner(row: Row): CoffeePartner {
  return {
    id: row.document_id,
    name: str(row.name)?.trim() ?? '',
    logo: image(row.logo_url, row.logo_formats, row.logo_width, row.logo_height),
    countryCode: str(row.country_code),
    primaryCategory: str(row.primary_category),
    website: str(row.website),
    instagram: str(row.instagram),
  };
}

export function bean(row: Row, origins: Row[], tags: Row[]): Bean {
  return {
    id: row.document_id,
    name: str(row.name) ?? '',
    slug: str(row.slug),
    type: str(row.type),
    roastLevel: str(row.roast_level),
    process: str(row.process),
    shortDescription: str(row.short_description),
    fullDescription: plainText(row.full_description),
    region: str(row.region),
    farm: str(row.farm),
    producer: str(row.producer),
    altitude: str(row.altitude),
    cuppingScore: num(row.cupping_score),
    blendComponents: parseJson(row.blend_components),
    photo: image(row.photo_url, row.photo_formats),
    learnMoreUrl: str(row.learn_more_url),
    origins: origins.map(o => ({ name: str(o.country_name), code: str(o.country_code) })),
    flavorTags: tags.map(t => ({ id: str(t.tag_document_id), name: str(t.tag_name) ?? '' })),
  };
}

export function event(row: Row, shopIds: string[]): Event {
  return {
    id: row.document_id,
    name: str(row.name) ?? '',
    description: plainText(row.description),
    type: str(row.event_type),
    startsAt: str(row.start_date),
    endsAt: str(row.end_date),
    cityId: str(row.location_document_id),
    venue: str(row.physical_location),
    website: str(row.website),
    isFree: bool(row.is_free),
    ticketPrice: num(row.ticket_price),
    ticketsAvailable: bool(row.tickets_available),
    image: image(row.image_url, row.image_formats, row.image_width, row.image_height),
    hostBrandId: str(row.host_brand_document_id),
    shopIds,
  };
}

export function person(row: Row): Person {
  const roles = parseJson<unknown[]>(row.roles);
  return {
    id: row.document_id,
    name: str(row.name) ?? '',
    slug: str(row.slug),
    bio: plainText(row.bio),
    photo: image(row.photo_url, row.photo_formats, row.photo_width, row.photo_height),
    roles: Array.isArray(roles) ? roles.filter((r): r is string => typeof r === 'string') : [],
    affiliation: str(row.affiliation_blurb),
    affiliatedShopId: str(row.affiliated_shop_document_id),
    links: links(row),
  };
}

export function newsArticle(row: Row, brandIds: string[], shopIds: string[], cityIds: string[]): NewsArticle {
  return {
    id: row.document_id,
    title: str(row.title) ?? '',
    slug: str(row.slug),
    statement: str(row.statement),
    summary: plainText(row.summary),
    publishedDate: str(row.published_date),
    type: str(row.news_type),
    importance: str(row.importance),
    sourceName: str(row.source_name),
    sourceUrl: str(row.source_url),
    author: str(row.source_author),
    image: image(row.image_url, row.image_formats, row.image_width, row.image_height),
    brandIds,
    shopIds,
    cityIds,
  };
}

/** Group rows into a map of key → values, keeping first-seen order. */
export function groupBy<T>(rows: Row[], key: string, value: (row: Row) => T): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const k = row[key];
    if (typeof k !== 'string') continue;
    const list = map.get(k);
    if (list) list.push(value(row));
    else map.set(k, [value(row)]);
  }
  return map;
}
