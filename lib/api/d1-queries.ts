/**
 * Server-side D1 query functions
 *
 * These functions query Cloudflare D1 directly from SSR pages.
 * All functions return null when D1 is unavailable (build time, dev without D1).
 */

import { Shop, Location, Country, CityArea, Brand } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseJSON(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') {
    try { return JSON.parse(v); } catch { return null; }
  }
  return v;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toBool(v: any): boolean | undefined {
  if (v === null || v === undefined) return undefined;
  return v === 1 || v === true;
}

/**
 * The full SELECT query for shops with brand JOIN.
 * Reused by getAllShopsD1 and getShopBySlugD1.
 */
export const SHOP_BRAND_SELECT = `
  SELECT
    s.document_id, s.id, s.name, s.slug, s.pref_name, s.description,
    s.address, s.postal_code, s.neighbourhood,
    s.lat, s.lng, s.country_code, s.local_density, s.quality_tier,
    s.location_document_id, s.location_name, s.location_slug,
    s.city_area_document_id, s.city_area_name, s.city_area_group,
    s.featured_image_url, s.featured_image_formats,
    s.google_rating, s.google_review_count, s.rating, s.rating_count,
    s.independent, s.is_chain,
    s.city_area_rec, s.city_area_rec_exp, s.working_rec, s.interior_rec, s.brewing_rec,
    s.shop_promo, s.shop_promo_code,
    s.has_wifi, s.has_food, s.has_outdoor_space, s.is_pet_friendly,
    s.has_v60, s.has_chemex, s.has_filter_coffee, s.has_slow_bar, s.has_kitchen,
    s.has_espresso, s.has_aeropress, s.has_french_press, s.has_cold_brew, s.has_batch_brew,
    s.public_tags, s.amenities,
    s.website, s.phone, s.phone_number, s.instagram, s.facebook, s.tiktok,
    s.google_place_id, s.google_formatted_address,
    s.coffee_partner_document_id, s.coffee_partner_name, s.coffee_partner_logo_url,
    s.opening_hours, s.research, s.cited_sources, s.vision_data, s.observations,
    s.gallery, s.menus,
    s.awards AS shop_awards, s.is_dev, s.source_articles,
    s.architects, s.price,
    s.created_at, s.updated_at, s.published_at,
    -- Full brand
    b.document_id AS b_document_id, b.id AS b_id, b.name AS b_name,
    b.type AS b_type, b.role AS b_role, b.description AS b_description,
    b.story AS b_story, b.statement AS b_statement,
    b.founded AS b_founded, b.founder AS b_founder, b.hq AS b_hq,
    b.price AS b_price, b.quality_tier AS b_quality_tier,
    b.logo_url AS b_logo_url, b.logo_formats AS b_logo_formats,
    b.bg_image_url AS b_bg_image_url, b.bg_image_formats AS b_bg_image_formats,
    b.website AS b_website, b.instagram AS b_instagram, b.facebook AS b_facebook,
    b.tiktok AS b_tiktok, b.twitter AS b_twitter, b.youtube AS b_youtube,
    b.phone AS b_phone, b.whatsapp AS b_whatsapp, b.line AS b_line,
    b.roast_own_beans AS b_roast_own_beans, b.own_roast_desc AS b_own_roast_desc,
    b.own_bean_link AS b_own_bean_link,
    b.specializes_light AS b_specializes_light, b.specializes_medium AS b_specializes_medium,
    b.specializes_dark AS b_specializes_dark,
    b.has_wifi AS b_has_wifi, b.has_food AS b_has_food,
    b.has_outdoor_space AS b_has_outdoor_space, b.is_pet_friendly AS b_is_pet_friendly,
    b.has_espresso AS b_has_espresso, b.has_filter_coffee AS b_has_filter_coffee,
    b.has_v60 AS b_has_v60, b.has_chemex AS b_has_chemex,
    b.has_aeropress AS b_has_aeropress, b.has_french_press AS b_has_french_press,
    b.has_cold_brew AS b_has_cold_brew, b.has_batch_brew AS b_has_batch_brew,
    b.has_siphon AS b_has_siphon, b.has_turkish_coffee AS b_has_turkish_coffee,
    b.oat_milk AS b_oat_milk, b.plant_milk AS b_plant_milk,
    b.equipment AS b_equipment, b.awards AS b_awards,
    b.research AS b_research, b.cited_sources AS b_cited_sources,
    b.observations AS b_observations,
    b.is_dev AS b_is_dev, b.created_at AS b_created_at,
    b.updated_at AS b_updated_at, b.published_at AS b_published_at
  FROM shops s
  LEFT JOIN brands b ON b.document_id = s.brand_document_id
`;

/**
 * Convert a D1 row (with b_ brand prefix) to a full Shop object.
 * Ported from useDataQueries.ts client-side d1RowToShop.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function d1RowToShop(r: any): Shop {
  const brand: Brand | undefined = r.b_document_id ? {
    id: r.b_id ?? 0,
    documentId: r.b_document_id,
    name: r.b_name || '',
    type: r.b_type,
    role: r.b_role,
    description: r.b_description,
    story: r.b_story,
    statement: r.b_statement,
    founded: r.b_founded,
    founder: r.b_founder,
    logo: r.b_logo_url ? { url: r.b_logo_url, formats: parseJSON(r.b_logo_formats) } : null,
    'bg-image': r.b_bg_image_url ? { url: r.b_bg_image_url, formats: parseJSON(r.b_bg_image_formats) } : null,
    website: r.b_website,
    instagram: r.b_instagram,
    facebook: r.b_facebook,
    tiktok: r.b_tiktok,
    phone: r.b_phone,
    roastOwnBeans: toBool(r.b_roast_own_beans),
    ownRoastDesc: r.b_own_roast_desc,
    ownBeanLink: r.b_own_bean_link,
    specializes_light: toBool(r.b_specializes_light),
    specializes_medium: toBool(r.b_specializes_medium),
    specializes_dark: toBool(r.b_specializes_dark),
    has_wifi: toBool(r.b_has_wifi),
    has_food: toBool(r.b_has_food),
    has_outdoor_space: toBool(r.b_has_outdoor_space),
    is_pet_friendly: toBool(r.b_is_pet_friendly),
    has_espresso: toBool(r.b_has_espresso),
    has_filter_coffee: toBool(r.b_has_filter_coffee),
    has_v60: toBool(r.b_has_v60),
    has_chemex: toBool(r.b_has_chemex),
    has_aeropress: toBool(r.b_has_aeropress),
    has_french_press: toBool(r.b_has_french_press),
    has_cold_brew: toBool(r.b_has_cold_brew),
    has_batch_brew: toBool(r.b_has_batch_brew),
    has_turkish_coffee: toBool(r.b_has_turkish_coffee),
    equipment: parseJSON(r.b_equipment),
    awards: parseJSON(r.b_awards),
    citedSources: parseJSON(r.b_cited_sources),
  } : undefined;

  return {
    id: r.id ?? 0,
    documentId: r.document_id,
    name: r.name,
    slug: r.slug,
    prefName: r.pref_name,
    description: r.description,
    address: r.address,
    neighbourhood: r.neighbourhood,
    coordinates: r.lat != null ? { lat: r.lat, lng: r.lng } : null,
    localDensity: r.local_density ?? 0,
    brand,
    location: r.location_document_id ? {
      id: 0,
      documentId: r.location_document_id,
      name: r.location_name || '',
      slug: r.location_slug || undefined,
    } : undefined,
    city_area: r.city_area_document_id ? {
      id: 0,
      documentId: r.city_area_document_id,
      name: r.city_area_name || '',
      group: r.city_area_group,
      location: r.location_document_id ? {
        documentId: r.location_document_id,
        name: r.location_name || '',
      } : undefined,
    } : undefined,
    country: r.country_code ? { id: 0, documentId: '', name: '', code: r.country_code } : undefined,
    featured_image: r.featured_image_url ? {
      url: r.featured_image_url,
      formats: parseJSON(r.featured_image_formats),
    } : null,
    gallery: parseJSON(r.gallery),
    menus: parseJSON(r.menus),
    coffee_partner: r.coffee_partner_document_id ? {
      id: 0,
      documentId: r.coffee_partner_document_id,
      name: r.coffee_partner_name || '',
      logo: r.coffee_partner_logo_url ? { url: r.coffee_partner_logo_url } : null,
    } : null,
    google_rating: r.google_rating,
    google_review_count: r.google_review_count,
    rating: r.rating,
    rating_count: r.rating_count,
    google_place_id: r.google_place_id,
    google_formatted_address: r.google_formatted_address,
    website: r.website,
    phone: r.phone,
    phone_number: r.phone_number,
    instagram: r.instagram,
    facebook: r.facebook,
    tiktok: r.tiktok,
    independent: toBool(r.independent),
    is_chain: toBool(r.is_chain),
    cityarearec: toBool(r.city_area_rec),
    cityAreaRec: toBool(r.city_area_rec),
    workingRec: toBool(r.working_rec),
    interiorRec: toBool(r.interior_rec),
    brewingRec: toBool(r.brewing_rec),
    has_wifi: toBool(r.has_wifi),
    has_food: toBool(r.has_food),
    has_outdoor_space: toBool(r.has_outdoor_space),
    is_pet_friendly: toBool(r.is_pet_friendly),
    has_v60: toBool(r.has_v60),
    has_chemex: toBool(r.has_chemex),
    has_filter_coffee: toBool(r.has_filter_coffee),
    has_slow_bar: toBool(r.has_slow_bar),
    has_kitchen: toBool(r.has_kitchen),
    has_espresso: toBool(r.has_espresso),
    has_aeropress: toBool(r.has_aeropress),
    has_french_press: toBool(r.has_french_press),
    has_cold_brew: toBool(r.has_cold_brew),
    has_batch_brew: toBool(r.has_batch_brew),
    amenity_overrides: parseJSON(r.amenity_overrides),
    brew_method_overrides: parseJSON(r.brew_method_overrides),
    menuData: parseJSON(r.menu_data),
    public_tags: parseJSON(r.public_tags),
    opening_hours: parseJSON(r.opening_hours),
    architects: r.architects,
    price: r.price,
    research: parseJSON(r.research),
    citedSources: parseJSON(r.cited_sources),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    publishedAt: r.published_at,
  } as Shop;
}

/** Convert a D1 brand row to a Brand object */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function d1RowToBrand(r: any): Brand {
  return {
    id: r.id ?? 0,
    documentId: r.document_id,
    name: r.name || '',
    type: r.type,
    role: r.role,
    description: r.description,
    story: r.story,
    statement: r.statement,
    founded: r.founded,
    founder: r.founder,
    hq: r.hq,
    price: r.price,
    quality_tier: r.quality_tier,
    logo: r.logo_url ? { url: r.logo_url, formats: parseJSON(r.logo_formats) } : null,
    'bg-image': r.bg_image_url ? { url: r.bg_image_url, formats: parseJSON(r.bg_image_formats) } : null,
    website: r.website,
    instagram: r.instagram,
    facebook: r.facebook,
    tiktok: r.tiktok,
    twitter: r.twitter,
    youtube: r.youtube,
    phone: r.phone,
    whatsapp: r.whatsapp,
    line: r.line,
    roastOwnBeans: toBool(r.roast_own_beans),
    ownRoastDesc: r.own_roast_desc,
    ownBeanLink: r.own_bean_link,
    specializes_light: toBool(r.specializes_light),
    specializes_medium: toBool(r.specializes_medium),
    specializes_dark: toBool(r.specializes_dark),
    has_wifi: toBool(r.has_wifi),
    has_food: toBool(r.has_food),
    has_outdoor_space: toBool(r.has_outdoor_space),
    is_pet_friendly: toBool(r.is_pet_friendly),
    has_espresso: toBool(r.has_espresso),
    has_filter_coffee: toBool(r.has_filter_coffee),
    has_v60: toBool(r.has_v60),
    has_chemex: toBool(r.has_chemex),
    has_aeropress: toBool(r.has_aeropress),
    has_french_press: toBool(r.has_french_press),
    has_cold_brew: toBool(r.has_cold_brew),
    has_batch_brew: toBool(r.has_batch_brew),
    has_siphon: toBool(r.has_siphon),
    has_turkish_coffee: toBool(r.has_turkish_coffee),
    oat_milk: toBool(r.oat_milk),
    plant_milk: toBool(r.plant_milk),
    equipment: parseJSON(r.equipment),
    awards: parseJSON(r.awards),
    research: parseJSON(r.research),
    citedSources: parseJSON(r.cited_sources),
    observations: parseJSON(r.observations),
  } as Brand;
}

/** Convert a D1 location row to a Location object */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function d1RowToLocation(r: any): Location {
  return {
    id: r.id ?? 0,
    documentId: r.document_id,
    name: r.name,
    slug: r.slug,
    story: r.story,
    headline: r.headline,
    rating_stars: r.rating_stars,
    inFocus: toBool(r.in_focus),
    beta: toBool(r.beta),
    comingSoon: toBool(r.coming_soon),
    primaryColor: r.primary_color,
    secondaryColor: r.secondary_color,
    coordinates: parseJSON(r.coordinates),
    boundary_coordinates: parseJSON(r.boundary_coordinates),
    background_image: r.bg_image_url ? {
      url: r.bg_image_url,
      formats: parseJSON(r.bg_image_formats),
    } : null,
    media_links: parseJSON(r.media_links),
    storyAuthor: r.story_author_name ? {
      id: r.story_author_id ?? 0,
      documentId: r.story_author_document_id || '',
      name: r.story_author_name,
      photo: r.story_author_photo_url ? { url: r.story_author_photo_url } : null,
    } : null,
    country: r.country_code ? {
      id: 0,
      documentId: r.country_document_id || '',
      name: r.country_name || '',
      code: r.country_code,
      primaryColor: r.country_primary_color,
      secondaryColor: r.country_secondary_color,
    } : undefined,
  } as Location;
}

/** Convert a D1 country row to a Country object */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function d1RowToCountry(r: any): Country {
  return {
    id: r.id ?? 0,
    documentId: r.document_id,
    name: r.name,
    code: r.code,
    slug: r.slug,
    story: r.story,
    supported: toBool(r.supported),
    comingSoon: toBool(r.coming_soon),
    primaryColor: r.primary_color,
    primaryColorDark: r.primary_color_dark,
    secondaryColor: r.secondary_color,
    secondaryColorDark: r.secondary_color_dark,
    accentColour: r.accent_colour,
    highInflation: toBool(r.high_inflation),
    producer: toBool(r.producer),
    region: r.region_name ? {
      id: 0,
      documentId: r.region_document_id || '',
      Name: r.region_name,
      comingSoon: toBool(r.region_coming_soon),
    } : undefined,
  };
}

/** Convert a D1 city_area row to a CityArea object */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function d1RowToCityArea(r: any): CityArea {
  return {
    id: r.id ?? 0,
    documentId: r.document_id,
    name: r.name,
    slug: r.slug,
    group: r.area_group,
    description: r.description,
    summary: r.summary,
    featuredImage: r.featured_image_url ? {
      url: r.featured_image_url,
      formats: parseJSON(r.featured_image_formats),
    } : null,
    boundary_coordinates: parseJSON(r.boundary_coordinates),
    center_coordinates: parseJSON(r.center_coordinates),
    postcode: r.postcode,
    nearest_tube: r.nearest_tube,
    comingSoon: toBool(r.coming_soon),
    location: r.location_document_id ? {
      id: 0,
      documentId: r.location_document_id,
      name: r.location_name || '',
      slug: r.location_slug,
      country: r.location_country_code ? {
        name: r.location_country_name,
        code: r.location_country_code,
      } : undefined,
    } : undefined,
  } as CityArea;
}

/** Get D1 database, returns null if unavailable */
async function getD1DB(): Promise<D1Database | null> {
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const { env } = await getCloudflareContext();
    return (env as Record<string, unknown>).DB as D1Database;
  } catch {
    return null;
  }
}

/**
 * Merge brand row data into a shop row with b_ prefix, then transform.
 * Used to work around D1's column limit (cannot JOIN shops + brands in one SELECT).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mergeShopWithBrand(shop: any, brandsMap: Map<string, any>): Shop {
  const brandDocId = shop.brand_document_id;
  if (brandDocId) {
    const brand = brandsMap.get(brandDocId);
    if (brand) {
      const merged = { ...shop };
      for (const [key, value] of Object.entries(brand)) {
        merged[`b_${key}`] = value;
      }
      return d1RowToShop(merged);
    }
  }
  return d1RowToShop(shop);
}

/** Fetch all shops from D1 with full brand data */
export async function getAllShopsD1(): Promise<Shop[] | null> {
  const db = await getD1DB();
  if (!db) return null;

  try {
    // Two separate queries to avoid D1 column limit on JOINs
    const [shopsResult, brandsResult] = await Promise.all([
      db.prepare('SELECT * FROM shops ORDER BY name').all(),
      db.prepare('SELECT * FROM brands').all(),
    ]);

    const brandsMap = new Map<string, Record<string, unknown>>();
    for (const b of brandsResult.results) {
      brandsMap.set(b.document_id as string, b as Record<string, unknown>);
    }

    console.log(`[D1] Loaded ${shopsResult.results.length} shops`);
    return shopsResult.results.map(shop => mergeShopWithBrand(shop, brandsMap));
  } catch (e) {
    console.error('[D1] getAllShopsD1 failed:', e);
    return null;
  }
}

/** Fetch a single shop by slug from D1 */
export async function getShopBySlugD1(slug: string): Promise<Shop | null> {
  const db = await getD1DB();
  if (!db) return null;

  try {
    const shop = await db
      .prepare('SELECT * FROM shops WHERE slug = ?1')
      .bind(slug)
      .first();
    if (!shop) return null;

    // Fetch brand separately if shop has one (avoids D1 column limit)
    const brandDocId = shop.brand_document_id as string | null;
    if (brandDocId) {
      const brand = await db
        .prepare('SELECT * FROM brands WHERE document_id = ?1')
        .bind(brandDocId)
        .first();
      if (brand) {
        const merged: Record<string, unknown> = { ...(shop as Record<string, unknown>) };
        for (const [key, value] of Object.entries(brand as Record<string, unknown>)) {
          merged[`b_${key}`] = value;
        }
        return d1RowToShop(merged);
      }
    }
    return d1RowToShop(shop);
  } catch (e) {
    console.error('[D1] getShopBySlugD1 failed:', e);
    return null;
  }
}

/** Fetch all locations from D1 */
export async function getAllLocationsD1(): Promise<Location[] | null> {
  const db = await getD1DB();
  if (!db) return null;

  try {
    const result = await db
      .prepare('SELECT * FROM locations ORDER BY name')
      .all();
    console.log(`[D1] Loaded ${result.results.length} locations`);
    return result.results.map(d1RowToLocation);
  } catch (e) {
    console.error('[D1] getAllLocationsD1 failed:', e);
    return null;
  }
}

/** Fetch a single location by slug from D1 */
export async function getLocationBySlugD1(slug: string): Promise<Location | null> {
  const db = await getD1DB();
  if (!db) return null;

  try {
    const row = await db
      .prepare('SELECT * FROM locations WHERE slug = ?1')
      .bind(slug)
      .first();
    return row ? d1RowToLocation(row) : null;
  } catch (e) {
    console.error('[D1] getLocationBySlugD1 failed:', e);
    return null;
  }
}

/** Fetch all countries from D1 */
export async function getAllCountriesD1(): Promise<Country[] | null> {
  const db = await getD1DB();
  if (!db) return null;

  try {
    const result = await db
      .prepare('SELECT * FROM countries ORDER BY name')
      .all();
    console.log(`[D1] Loaded ${result.results.length} countries`);
    return result.results.map(d1RowToCountry);
  } catch (e) {
    console.error('[D1] getAllCountriesD1 failed:', e);
    return null;
  }
}

/** Fetch all city areas from D1 */
export async function getAllCityAreasD1(): Promise<CityArea[] | null> {
  const db = await getD1DB();
  if (!db) return null;

  try {
    const result = await db
      .prepare('SELECT * FROM city_areas ORDER BY name')
      .all();
    console.log(`[D1] Loaded ${result.results.length} city areas`);
    return result.results.map(d1RowToCityArea);
  } catch (e) {
    console.error('[D1] getAllCityAreasD1 failed:', e);
    return null;
  }
}

/** Fetch all brands from D1 */
export async function getAllBrandsD1(): Promise<Brand[] | null> {
  const db = await getD1DB();
  if (!db) return null;

  try {
    const result = await db
      .prepare('SELECT * FROM brands ORDER BY name')
      .all();
    console.log(`[D1] Loaded ${result.results.length} brands`);
    return result.results.map(d1RowToBrand);
  } catch (e) {
    console.error('[D1] getAllBrandsD1 failed:', e);
    return null;
  }
}

/** Fetch shops by location from D1 */
export async function getShopsByLocationD1(locationDocumentId: string): Promise<Shop[] | null> {
  const db = await getD1DB();
  if (!db) return null;

  try {
    // Two separate queries to avoid D1 column limit on JOINs
    const [shopsResult, brandsResult] = await Promise.all([
      db.prepare('SELECT * FROM shops WHERE location_document_id = ?1 ORDER BY name')
        .bind(locationDocumentId)
        .all(),
      db.prepare('SELECT * FROM brands').all(),
    ]);

    const brandsMap = new Map<string, Record<string, unknown>>();
    for (const b of brandsResult.results) {
      brandsMap.set(b.document_id as string, b as Record<string, unknown>);
    }

    console.log(`[D1] Loaded ${shopsResult.results.length} shops for location ${locationDocumentId}`);
    return shopsResult.results.map(shop => mergeShopWithBrand(shop, brandsMap));
  } catch (e) {
    console.error('[D1] getShopsByLocationD1 failed:', e);
    return null;
  }
}
