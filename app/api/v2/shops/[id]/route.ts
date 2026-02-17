import { NextRequest, NextResponse } from 'next/server';
import { getDB, proxyToProd } from '@/lib/api/d1';

/**
 * GET /api/v2/shops/[id] — Full shop detail
 *
 * Returns the complete shop record with full brand data, beans,
 * suppliers, and all relations.  Called on-demand when a user
 * opens a shop detail view.
 *
 * [id] is the shop's documentId (Strapi v5 UUID).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDB();
    const shopId = params.id;
    if (!db) return proxyToProd(`/api/v2/shops/${shopId}`);

    // Fetch the shop
    const shop = await db
      .prepare('SELECT * FROM shops WHERE document_id = ?1')
      .bind(shopId)
      .first();

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    // Fetch full brand if shop has one
    let brand = null;
    if (shop.brand_document_id) {
      brand = await db
        .prepare('SELECT * FROM brands WHERE document_id = ?1')
        .bind(shop.brand_document_id as string)
        .first();

      if (brand) {
        // Fetch brand's beans
        const beansResult = await db
          .prepare('SELECT * FROM beans WHERE brand_document_id = ?1')
          .bind(shop.brand_document_id as string)
          .all();

        const beans = [];
        for (const bean of beansResult.results) {
          // Fetch origins
          const originsResult = await db
            .prepare('SELECT country_name AS name, country_code AS code FROM bean_origins WHERE bean_document_id = ?1')
            .bind(bean.document_id as string)
            .all();

          // Fetch flavor tags
          const tagsResult = await db
            .prepare('SELECT tag_document_id AS documentId, tag_name AS name FROM bean_flavor_tags WHERE bean_document_id = ?1')
            .bind(bean.document_id as string)
            .all();

          beans.push({
            ...formatBean(bean),
            origins: originsResult.results,
            flavorTags: tagsResult.results,
          });
        }

        // Fetch suppliers
        const suppliersResult = await db
          .prepare(`
            SELECT b.document_id AS documentId, b.name, b.type, b.logo_url AS logoUrl,
                   b.roast_own_beans AS roastOwnBeans, b.website, b.instagram
            FROM brand_suppliers bs
            JOIN brands b ON b.document_id = bs.supplier_document_id
            WHERE bs.brand_document_id = ?1
          `)
          .bind(shop.brand_document_id as string)
          .all();

        // Fetch own roast countries
        const roastCountriesResult = await db
          .prepare('SELECT country_name AS name, country_code AS code FROM brand_roast_countries WHERE brand_document_id = ?1')
          .bind(shop.brand_document_id as string)
          .all();

        brand = {
          ...formatBrand(brand),
          beans,
          suppliers: suppliersResult.results.map(formatSupplier),
          ownRoastCountry: roastCountriesResult.results,
        };
      }
    }

    const formattedShop = formatShop(shop, brand);

    return NextResponse.json(formattedShop, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('D1 shop detail query failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shop detail' },
      { status: 500 }
    );
  }
}

/** Map D1 snake_case row → camelCase Shop shape matching TypeScript types */
function formatShop(row: Record<string, unknown>, brand: Record<string, unknown> | null) {
  return {
    id: row.id,
    documentId: row.document_id,
    name: row.name,
    prefName: row.pref_name,
    slug: row.slug,
    description: row.description,
    address: row.address,
    postal_code: row.postal_code,
    neighbourhood: row.neighbourhood,
    coordinates: row.lat != null ? { lat: row.lat, lng: row.lng } : null,
    brand: brand || (row.brand_document_id ? {
      documentId: row.brand_document_id,
      name: row.brand_name,
      type: row.brand_type,
      logo: row.brand_logo_url ? { url: row.brand_logo_url } : null,
      statement: row.brand_statement,
    } : null),
    location: row.location_document_id ? {
      documentId: row.location_document_id,
      name: row.location_name,
      slug: row.location_slug,
    } : undefined,
    city_area: row.city_area_document_id ? {
      documentId: row.city_area_document_id,
      name: row.city_area_name,
      group: row.city_area_group,
    } : undefined,
    country: row.country_code ? { code: row.country_code } : undefined,
    featured_image: row.featured_image_url ? {
      url: row.featured_image_url,
      formats: parseJSON(row.featured_image_formats),
    } : null,
    gallery: parseJSON(row.gallery),
    menus: parseJSON(row.menus),
    coffee_partner: row.coffee_partner_document_id ? {
      documentId: row.coffee_partner_document_id,
      name: row.coffee_partner_name,
      logo: row.coffee_partner_logo_url ? { url: row.coffee_partner_logo_url } : null,
    } : null,
    // Amenities
    has_wifi: toBool(row.has_wifi),
    has_food: toBool(row.has_food),
    has_outdoor_space: toBool(row.has_outdoor_space),
    is_pet_friendly: toBool(row.is_pet_friendly),
    has_v60: toBool(row.has_v60),
    has_chemex: toBool(row.has_chemex),
    has_filter_coffee: toBool(row.has_filter_coffee),
    has_slow_bar: toBool(row.has_slow_bar),
    has_kitchen: toBool(row.has_kitchen),
    has_espresso: toBool(row.has_espresso),
    has_aeropress: toBool(row.has_aeropress),
    has_french_press: toBool(row.has_french_press),
    has_cold_brew: toBool(row.has_cold_brew),
    has_batch_brew: toBool(row.has_batch_brew),
    // Flags
    is_chain: toBool(row.is_chain),
    independent: toBool(row.independent),
    cityarearec: toBool(row.city_area_rec),
    // Ratings
    google_rating: row.google_rating,
    google_review_count: row.google_review_count,
    rating: row.rating,
    rating_count: row.rating_count,
    // Google Places
    google_place_id: row.google_place_id,
    google_place_verified: toBool(row.google_place_verified),
    google_place_last_sync: row.google_place_last_sync,
    google_place_match_confidence: row.google_place_match_confidence,
    google_business_status: row.google_business_status,
    google_photo_reference: row.google_photo_reference,
    google_formatted_address: row.google_formatted_address,
    // Contact
    website: row.website,
    phone: row.phone,
    phone_number: row.phone_number,
    instagram: row.instagram,
    facebook: row.facebook,
    tiktok: row.tiktok,
    // Tags
    public_tags: parseJSON(row.public_tags),
    amenities: parseJSON(row.amenities),
    // Other
    architects: row.architects,
    price: row.price,
    quality_tier: row.quality_tier,
    opening_hours: parseJSON(row.opening_hours),
    is_open: toBool(row.is_open),
    localDensity: row.local_density,
    // JSON fields
    research: parseJSON(row.research),
    citedSources: parseJSON(row.cited_sources),
    observations: parseJSON(row.observations),
    visionData: parseJSON(row.vision_data),
    // Metadata
    isDev: toBool(row.is_dev),
    awards: parseJSON(row.awards),
    source_articles: parseJSON(row.source_articles),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  };
}

function formatBrand(row: Record<string, unknown>) {
  return {
    id: row.id,
    documentId: row.document_id,
    name: row.name,
    type: row.type,
    role: row.role,
    description: row.description,
    story: row.story,
    statement: row.statement,
    founded: row.founded,
    founder: row.founder,
    hq: row.hq,
    price: row.price,
    quality_tier: row.quality_tier,
    logo: row.logo_url ? { url: row.logo_url, formats: parseJSON(row.logo_formats) } : null,
    'bg-image': row.bg_image_url ? { url: row.bg_image_url, formats: parseJSON(row.bg_image_formats) } : null,
    website: row.website,
    instagram: row.instagram,
    facebook: row.facebook,
    tiktok: row.tiktok,
    twitter: row.twitter,
    youtube: row.youtube,
    phone: row.phone,
    whatsapp: row.whatsapp,
    line: row.line,
    roastOwnBeans: toBool(row.roast_own_beans),
    ownRoastDesc: row.own_roast_desc,
    ownBeanLink: row.own_bean_link,
    specializes_light: toBool(row.specializes_light),
    specializes_medium: toBool(row.specializes_medium),
    specializes_dark: toBool(row.specializes_dark),
    has_wifi: toBool(row.has_wifi),
    has_food: toBool(row.has_food),
    has_outdoor_space: toBool(row.has_outdoor_space),
    is_pet_friendly: toBool(row.is_pet_friendly),
    has_espresso: toBool(row.has_espresso),
    has_filter_coffee: toBool(row.has_filter_coffee),
    has_v60: toBool(row.has_v60),
    has_chemex: toBool(row.has_chemex),
    has_aeropress: toBool(row.has_aeropress),
    has_french_press: toBool(row.has_french_press),
    has_cold_brew: toBool(row.has_cold_brew),
    has_batch_brew: toBool(row.has_batch_brew),
    has_siphon: toBool(row.has_siphon),
    oatMilk: toBool(row.oat_milk),
    plantMilk: toBool(row.plant_milk),
    equipment: parseJSON(row.equipment),
    awards: parseJSON(row.awards),
    research: parseJSON(row.research),
    citedSources: parseJSON(row.cited_sources),
    observations: parseJSON(row.observations),
    isDev: toBool(row.is_dev),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  };
}

function formatBean(row: Record<string, unknown>) {
  return {
    id: row.id,
    documentId: row.document_id,
    name: row.name,
    slug: row.slug,
    type: row.type,
    roastLevel: row.roast_level,
    process: row.process,
    shortDescription: row.short_description,
    fullDescription: row.full_description,
    learnMoreUrl: row.learn_more_url,
    region: row.region,
    farm: row.farm,
    producer: row.producer,
    altitude: row.altitude,
    cuppingScore: row.cupping_score,
    blendComponents: row.blend_components,
    photo: row.photo_url ? { url: row.photo_url, formats: parseJSON(row.photo_formats) } : null,
    citedSources: parseJSON(row.cited_sources),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  };
}

function formatSupplier(row: Record<string, unknown>) {
  return {
    documentId: row.documentId,
    name: row.name,
    type: row.type,
    logo: row.logoUrl ? { url: row.logoUrl } : null,
    roastOwnBeans: toBool(row.roastOwnBeans),
    website: row.website,
    instagram: row.instagram,
  };
}

function parseJSON(val: unknown): unknown {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return null; }
  }
  return val;
}

function toBool(val: unknown): boolean | null {
  if (val === null || val === undefined) return null;
  return val === 1 || val === true;
}
