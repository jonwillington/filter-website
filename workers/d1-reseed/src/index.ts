/**
 * D1 Reseed Worker
 *
 * Runs nightly at 3am UTC via cron trigger.
 * Fetches all data from Strapi, loads it into `__next` tables, then swaps them in
 * with one transaction, so readers never see empty or half-filled tables.
 *
 * This is insurance against missed webhooks. The real-time sync handles
 * individual updates; this worker ensures the full dataset stays in sync.
 */

import {
  NATIVE_MODELS,
  NATIVE_TABLES,
  NATIVE_TABLE_DDL,
  SHOP_EVENTS_PARAMS,
  indexesFor,
  shopEventStatements,
  upsertStatements,
  type NativeModel,
} from '../../shared/native-content';

interface Env {
  DB: D1Database;
  STRAPI_URL: string;
  STRAPI_TOKEN: string;
  /** Required by GET /reseed in the x-reseed-secret header. Set with `wrangler secret put RESEED_SECRET`. */
  RESEED_SECRET: string;
}

// ─── SQL helpers ───────────────────────────────────────────────────────────────

function esc(val: unknown): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

function boolInt(val: unknown): string {
  if (val === null || val === undefined) return 'NULL';
  return val ? '1' : '0';
}

function getCoords(shop: any): { lat: number | null; lng: number | null } {
  if (shop.coordinates?.lat && shop.coordinates?.lng) {
    return { lat: shop.coordinates.lat, lng: shop.coordinates.lng };
  }
  if (shop.latitude && shop.longitude) {
    return { lat: shop.latitude, lng: shop.longitude };
  }
  return { lat: null, lng: null };
}

function getCountryCode(shop: any): string | null {
  if (shop.country?.code) return shop.country.code;
  if (shop.location?.country?.code) return shop.location.country.code;
  const ca = shop.city_area || shop.cityArea;
  if (ca?.location?.country?.code) return ca.location.country.code;
  return null;
}

// ─── SQL builders (ported from seed-d1.js) ─────────────────────────────────────

function buildBrandInsert(brand: any): string {
  const cols = [
    'document_id', 'id', 'name', 'type', 'role', 'description', 'story', 'statement',
    'founded', 'founder', 'hq', 'price', 'quality_tier',
    'logo_url', 'logo_formats', 'bg_image_url', 'bg_image_formats',
    'website', 'instagram', 'facebook', 'tiktok', 'twitter', 'youtube', 'phone', 'whatsapp', 'line',
    'roast_own_beans', 'own_roast_desc', 'own_bean_link',
    'specializes_light', 'specializes_medium', 'specializes_dark',
    'has_wifi', 'has_food', 'has_outdoor_space', 'is_pet_friendly',
    'has_espresso', 'has_filter_coffee', 'has_v60', 'has_chemex',
    'has_aeropress', 'has_french_press', 'has_cold_brew', 'has_batch_brew',
    'has_siphon', 'has_turkish_coffee', 'oat_milk', 'plant_milk',
    'equipment', 'awards', 'research', 'cited_sources', 'observations', 'source_articles',
    'is_dev', 'created_at', 'updated_at', 'published_at',
  ];

  const vals = [
    esc(brand.documentId), brand.id || 'NULL', esc(brand.name), esc(brand.type), esc(brand.role),
    esc(brand.description), esc(brand.story), esc(brand.statement),
    esc(brand.founded), esc(brand.Founder || brand.founder), esc(brand.hq), esc(brand.price), esc(brand.quality_tier),
    esc(brand.logo?.url), brand.logo?.formats ? esc(brand.logo.formats) : 'NULL',
    esc(brand['bg-image']?.url), brand['bg-image']?.formats ? esc(brand['bg-image'].formats) : 'NULL',
    esc(brand.website), esc(brand.instagram), esc(brand.facebook), esc(brand.tiktok),
    esc(brand.twitter), esc(brand.youtube), esc(brand.phone), esc(brand.whatsapp), esc(brand.line),
    boolInt(brand.roastOwnBeans), esc(brand.ownRoastDesc), esc(brand.ownBeanLink),
    boolInt(brand.specializes_light), boolInt(brand.specializes_medium), boolInt(brand.specializes_dark),
    boolInt(brand.has_wifi), boolInt(brand.has_food), boolInt(brand.has_outdoor_space), boolInt(brand.is_pet_friendly),
    boolInt(brand.has_espresso), boolInt(brand.has_filter_coffee), boolInt(brand.has_v60), boolInt(brand.has_chemex),
    boolInt(brand.has_aeropress), boolInt(brand.has_french_press), boolInt(brand.has_cold_brew), boolInt(brand.has_batch_brew),
    boolInt(brand.has_siphon), boolInt(brand.has_turkish_coffee), boolInt(brand.oatMilk), boolInt(brand.plantMilk),
    brand.equipment ? esc(brand.equipment) : 'NULL',
    brand.awards ? esc(brand.awards) : 'NULL',
    brand.research ? esc(brand.research) : 'NULL',
    brand.citedSources ? esc(brand.citedSources) : 'NULL',
    brand.observations ? esc(brand.observations) : 'NULL',
    brand.source_articles ? esc(brand.source_articles) : 'NULL',
    boolInt(brand.isDev), esc(brand.createdAt), esc(brand.updatedAt), esc(brand.publishedAt),
  ];

  return `INSERT OR REPLACE INTO brands (${cols.join(',')}) VALUES (${vals.join(',')});`;
}

function buildShopInsert(shop: any): string {
  const coords = getCoords(shop);
  const brand = shop.brand;
  const ca = shop.city_area || shop.cityArea;
  const cp = shop.coffee_partner;
  const countryCode = getCountryCode(shop);

  const cols = [
    'document_id', 'id', 'name', 'pref_name', 'slug', 'description', 'address', 'postal_code', 'neighbourhood',
    'lat', 'lng',
    'brand_document_id', 'location_document_id', 'city_area_document_id', 'country_code',
    'brand_name', 'brand_type', 'brand_logo_url', 'brand_statement',
    'location_name', 'location_slug', 'city_area_name', 'city_area_group',
    'featured_image_url', 'featured_image_formats',
    'gallery', 'menus',
    'has_wifi', 'has_food', 'has_outdoor_space', 'is_pet_friendly',
    'has_v60', 'has_chemex', 'has_filter_coffee', 'has_slow_bar', 'has_kitchen',
    'has_espresso', 'has_aeropress', 'has_french_press', 'has_cold_brew', 'has_batch_brew',
    'is_chain', 'independent',
    'city_area_rec', 'city_area_rec_exp', 'working_rec', 'interior_rec', 'brewing_rec',
    'shop_promo', 'shop_promo_code',
    'google_rating', 'google_review_count', 'rating', 'rating_count',
    'google_place_id', 'google_place_verified', 'google_place_last_sync', 'google_place_match_confidence',
    'google_business_status', 'google_photo_reference', 'google_formatted_address', 'google_plus_code',
    'google_types', 'google_places_last_updated', 'google_coordinates_last_updated',
    'website', 'phone', 'phone_number', 'instagram', 'facebook', 'tiktok',
    'amenity_overrides', 'brew_method_overrides', 'menu_data',
    'public_tags', 'amenities',
    'architects', 'price', 'quality_tier', 'opening_hours', 'is_open',
    'local_density',
    'research', 'cited_sources', 'observations', 'vision_data', 'preference_profile',
    'coffee_partner_document_id', 'coffee_partner_name', 'coffee_partner_logo_url',
    'is_dev', 'awards', 'source_articles', 'created_at', 'updated_at', 'published_at',
  ];

  const vals = [
    esc(shop.documentId), shop.id || 'NULL', esc(shop.name), esc(shop.prefName), esc(shop.slug),
    esc(shop.description), esc(shop.address), esc(shop.postal_code), esc(shop.neighbourhood),
    coords.lat !== null ? coords.lat : 'NULL', coords.lng !== null ? coords.lng : 'NULL',
    esc(brand?.documentId), esc(shop.location?.documentId), esc(ca?.documentId), esc(countryCode),
    esc(brand?.name), esc(brand?.type), esc(brand?.logo?.url), esc(brand?.statement),
    esc(shop.location?.name), esc(shop.location?.slug), esc(ca?.name), esc(ca?.group),
    esc(shop.featured_image?.url), shop.featured_image?.formats ? esc(shop.featured_image.formats) : 'NULL',
    shop.gallery ? esc(shop.gallery) : 'NULL',
    shop.menus ? esc(shop.menus) : 'NULL',
    boolInt(shop.has_wifi), boolInt(shop.has_food), boolInt(shop.has_outdoor_space), boolInt(shop.is_pet_friendly),
    boolInt(shop.has_v60), boolInt(shop.has_chemex), boolInt(shop.has_filter_coffee),
    boolInt(shop.has_slow_bar), boolInt(shop.has_kitchen),
    boolInt(shop.has_espresso), boolInt(shop.has_aeropress), boolInt(shop.has_french_press),
    boolInt(shop.has_cold_brew), boolInt(shop.has_batch_brew),
    boolInt(shop.is_chain), boolInt(shop.independent),
    boolInt(shop.cityAreaRec), esc(shop.cityAreaRecExp),
    boolInt(shop.workingRec), boolInt(shop.interiorRec), boolInt(shop.brewingRec),
    esc(shop.shopPromo), esc(shop.shopPromoCode),
    shop.google_rating != null ? shop.google_rating : 'NULL',
    shop.google_review_count != null ? shop.google_review_count : 'NULL',
    shop.rating != null ? shop.rating : 'NULL',
    shop.rating_count != null ? shop.rating_count : 'NULL',
    esc(shop.google_place_id), boolInt(shop.google_place_verified), esc(shop.google_place_last_sync),
    shop.google_place_match_confidence != null ? shop.google_place_match_confidence : 'NULL',
    esc(shop.google_business_status), esc(shop.google_photo_reference), esc(shop.google_formatted_address),
    esc(shop.google_plus_code),
    shop.google_types ? esc(shop.google_types) : 'NULL',
    esc(shop.google_places_last_updated), esc(shop.google_coordinates_last_updated),
    esc(shop.website), esc(shop.phone), esc(shop.phone_number),
    esc(shop.instagram), esc(shop.facebook), esc(shop.tiktok),
    shop.amenity_overrides ? esc(shop.amenity_overrides) : 'NULL',
    shop.brew_method_overrides ? esc(shop.brew_method_overrides) : 'NULL',
    shop.menuData ? esc(shop.menuData) : 'NULL',
    shop.public_tags ? esc(shop.public_tags) : 'NULL',
    shop.amenities ? esc(shop.amenities) : 'NULL',
    esc(shop.architects), esc(shop.price), esc(shop.quality_tier),
    shop.opening_hours ? esc(shop.opening_hours) : 'NULL',
    boolInt(shop.is_open),
    shop.localDensity !== undefined ? shop.localDensity : 0,
    shop.research ? esc(shop.research) : 'NULL',
    shop.citedSources ? esc(shop.citedSources) : 'NULL',
    shop.observations ? esc(shop.observations) : 'NULL',
    shop.visionData ? esc(shop.visionData) : 'NULL',
    shop.preferenceProfile ? esc(shop.preferenceProfile) : 'NULL',
    esc(cp?.documentId), esc(cp?.name), esc(cp?.logo?.url),
    boolInt(shop.isDev),
    shop.awards ? esc(shop.awards) : 'NULL',
    shop.source_articles ? esc(shop.source_articles) : 'NULL',
    esc(shop.createdAt), esc(shop.updatedAt), esc(shop.publishedAt),
  ];

  return `INSERT OR REPLACE INTO shops (${cols.join(',')}) VALUES (${vals.join(',')});`;
}

function buildLocationInsert(loc: any): string {
  const country = loc.country;
  const storyAuthor = loc.storyAuthor;
  const bgImage = loc.background_image;

  const cols = [
    'document_id', 'id', 'name', 'slug', 'story', 'headline',
    'rating_stars', 'population', 'timezone',
    'in_focus', 'beta', 'coming_soon',
    'primary_color', 'secondary_color',
    'coordinates', 'boundary_coordinates',
    'bg_image_url', 'bg_image_formats', 'media_links',
    'story_author_id', 'story_author_document_id', 'story_author_name', 'story_author_photo_url',
    'country_document_id', 'country_name', 'country_code',
    'country_primary_color', 'country_secondary_color',
    'created_at', 'updated_at', 'published_at',
  ];

  const vals = [
    esc(loc.documentId), loc.id || 'NULL', esc(loc.name), esc(loc.slug), esc(loc.story), esc(loc.headline),
    loc.rating_stars != null ? loc.rating_stars : 'NULL',
    esc(loc.population), esc(loc.timezone),
    boolInt(loc.inFocus), boolInt(loc.beta), boolInt(loc.comingSoon),
    esc(loc.primaryColor), esc(loc.secondaryColor),
    loc.coordinates ? esc(loc.coordinates) : 'NULL',
    loc.boundary_coordinates ? esc(loc.boundary_coordinates) : 'NULL',
    esc(bgImage?.url), bgImage?.formats ? esc(bgImage.formats) : 'NULL',
    loc.media_links ? esc(loc.media_links) : 'NULL',
    storyAuthor?.id || 'NULL', esc(storyAuthor?.documentId), esc(storyAuthor?.name),
    esc(storyAuthor?.photo?.url),
    esc(country?.documentId), esc(country?.name), esc(country?.code),
    esc(country?.primaryColor), esc(country?.secondaryColor),
    esc(loc.createdAt), esc(loc.updatedAt), esc(loc.publishedAt),
  ];

  return `INSERT OR REPLACE INTO locations (${cols.join(',')}) VALUES (${vals.join(',')});`;
}

function buildCountryInsert(country: any): string {
  const region = country.region;

  const cols = [
    'document_id', 'id', 'name', 'code', 'slug', 'story',
    'supported', 'coming_soon',
    'primary_color', 'primary_color_dark', 'secondary_color', 'secondary_color_dark',
    'accent_colour', 'high_inflation', 'producer',
    'region_document_id', 'region_name', 'region_coming_soon',
    'created_at', 'updated_at', 'published_at',
  ];

  const vals = [
    esc(country.documentId), country.id || 'NULL', esc(country.name), esc(country.code),
    esc(country.slug), esc(country.story),
    boolInt(country.supported), boolInt(country.comingSoon),
    esc(country.primaryColor), esc(country.primaryColorDark),
    esc(country.secondaryColor), esc(country.secondaryColorDark),
    esc(country.accentColour), boolInt(country.highInflation), boolInt(country.producer),
    esc(region?.documentId), esc(region?.Name), boolInt(region?.comingSoon),
    esc(country.createdAt), esc(country.updatedAt), esc(country.publishedAt),
  ];

  return `INSERT OR REPLACE INTO countries (${cols.join(',')}) VALUES (${vals.join(',')});`;
}

function buildCityAreaInsert(ca: any): string {
  const loc = ca.location;

  const cols = [
    'document_id', 'id', 'name', 'slug', 'area_group', 'description', 'summary',
    'featured_image_url', 'featured_image_formats',
    'boundary_coordinates',
    'center_coordinates', 'postcode', 'nearest_tube', 'coming_soon',
    'location_document_id', 'location_name', 'location_slug',
    'location_country_name', 'location_country_code',
    'created_at', 'updated_at', 'published_at',
  ];

  // Simplify boundary coordinates inline (same logic as seed-d1.js)
  let boundaryVal = 'NULL';
  if (ca.boundary_coordinates) {
    let coords = ca.boundary_coordinates;
    if (Array.isArray(coords)) {
      coords = coords.map((c: any) => ({
        lat: Math.round(c.lat * 100000) / 100000,
        lng: Math.round(c.lng * 100000) / 100000,
      }));
      const MAX_POINTS = 1500;
      if (coords.length > MAX_POINTS) {
        const step = Math.ceil(coords.length / MAX_POINTS);
        coords = coords.filter((_: any, idx: number) => idx % step === 0);
      }
    }
    boundaryVal = esc(coords);
  }

  const vals = [
    esc(ca.documentId), ca.id || 'NULL', esc(ca.name), esc(ca.slug), esc(ca.group),
    esc(ca.description), esc(ca.summary),
    esc(ca.featuredImage?.url), ca.featuredImage?.formats ? esc(ca.featuredImage.formats) : 'NULL',
    boundaryVal,
    ca.center_coordinates ? esc(ca.center_coordinates) : 'NULL',
    esc(ca.postcode), esc(ca.nearest_tube), boolInt(ca.comingSoon),
    esc(loc?.documentId), esc(loc?.name), esc(loc?.slug),
    esc(loc?.country?.name), esc(loc?.country?.code),
    esc(ca.createdAt), esc(ca.updatedAt), esc(ca.publishedAt),
  ];

  return `INSERT OR REPLACE INTO city_areas (${cols.join(',')}) VALUES (${vals.join(',')});`;
}

function buildBeanInsert(bean: any): string {
  const cols = [
    'document_id', 'id', 'name', 'slug', 'type', 'roast_level', 'process',
    'short_description', 'full_description', 'learn_more_url',
    'region', 'farm', 'producer', 'altitude', 'cupping_score', 'blend_components',
    'photo_url', 'photo_formats', 'brand_document_id', 'cited_sources',
    'created_at', 'updated_at', 'published_at',
  ];

  const vals = [
    esc(bean.documentId), bean.id || 'NULL', esc(bean.name), esc(bean.slug), esc(bean.type),
    esc(bean.roastLevel), esc(bean.process),
    esc(bean.shortDescription), esc(bean.fullDescription), esc(bean.learnMoreUrl),
    esc(bean.region), esc(bean.farm), esc(bean.producer), esc(bean.altitude),
    bean.cuppingScore != null ? bean.cuppingScore : 'NULL',
    esc(bean.blendComponents),
    esc(bean.photo?.url), bean.photo?.formats ? esc(bean.photo.formats) : 'NULL',
    esc(bean.brandDocumentId),
    bean.citedSources ? esc(bean.citedSources) : 'NULL',
    esc(bean.createdAt), esc(bean.updatedAt), esc(bean.publishedAt),
  ];

  return `INSERT OR REPLACE INTO beans (${cols.join(',')}) VALUES (${vals.join(',')});`;
}

// ─── Strapi fetching ───────────────────────────────────────────────────────────

async function fetchPaginated(
  baseUrl: string,
  endpoint: string,
  token: string,
  params: Record<string, string> = {},
  pageSize: number = 100
): Promise<any[]> {
  const allData: any[] = [];
  let page = 1;
  const maxRetries = 5;

  while (true) {
    const url = new URL(`${baseUrl}/${endpoint}`);
    url.searchParams.set('pagination[page]', String(page));
    url.searchParams.set('pagination[pageSize]', String(pageSize));

    for (const [key, val] of Object.entries(params)) {
      url.searchParams.set(key, val);
    }

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (attempt > 0) {
        // Exponential backoff: 2s, 4s, 8s, 16s
        await new Promise(r => setTimeout(r, 2000 * Math.pow(2, attempt - 1)));
      }

      const res = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        const json = await res.json() as any;
        const data = json.data || [];
        allData.push(...data);

        // Strapi's cached responses can omit `pageCount`, so also stop on a short page.
        const pagination = json.meta?.pagination;
        if (!pagination || data.length < pageSize || page >= (pagination.pageCount ?? page)) return allData;
        page++;
        lastError = null;
        break;
      }

      if (res.status >= 500) {
        lastError = new Error(`${endpoint} page ${page}: ${res.status} ${res.statusText}`);
        continue; // retry
      }

      throw new Error(`Failed to fetch ${endpoint} page ${page}: ${res.status} ${res.statusText}`);
    }

    if (lastError) throw lastError;
  }
}
// ─── Schema ────────────────────────────────────────────────────────────────────
//
// Each table is built as `<name>__next`, filled, then swapped in with one
// transactional batch (DROP live → RENAME next → CREATE INDEX). Readers see the old
// data or the new data, never an empty or half-filled table.
//
// Keep in step with db/schema.sql.

interface TableDef {
  name: string;
  ddl: string; // `{t}` is replaced with the physical table name
  indexes: string[];
}

const CORE_TABLES: TableDef[] = [
  {
    name: 'brands',
    ddl: `CREATE TABLE {t} (
  document_id TEXT PRIMARY KEY,
  id INTEGER,
  name TEXT NOT NULL,
  type TEXT, role TEXT, description TEXT, story TEXT, statement TEXT,
  founded TEXT, founder TEXT, hq TEXT, price TEXT, quality_tier TEXT,
  logo_url TEXT, logo_formats TEXT,
  bg_image_url TEXT, bg_image_formats TEXT,
  website TEXT, instagram TEXT, facebook TEXT, tiktok TEXT,
  twitter TEXT, youtube TEXT, phone TEXT, whatsapp TEXT, line TEXT,
  roast_own_beans INTEGER, own_roast_desc TEXT, own_bean_link TEXT,
  specializes_light INTEGER, specializes_medium INTEGER, specializes_dark INTEGER,
  has_wifi INTEGER, has_food INTEGER, has_outdoor_space INTEGER, is_pet_friendly INTEGER,
  has_espresso INTEGER, has_filter_coffee INTEGER, has_v60 INTEGER, has_chemex INTEGER,
  has_aeropress INTEGER, has_french_press INTEGER, has_cold_brew INTEGER, has_batch_brew INTEGER,
  has_siphon INTEGER, has_turkish_coffee INTEGER, oat_milk INTEGER, plant_milk INTEGER,
  equipment TEXT, awards TEXT, research TEXT, cited_sources TEXT, observations TEXT, source_articles TEXT,
  is_dev INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT, published_at TEXT
)`,
    indexes: [],
  },
  {
    name: 'brand_suppliers',
    ddl: `CREATE TABLE {t} (
  brand_document_id TEXT NOT NULL,
  supplier_document_id TEXT NOT NULL,
  PRIMARY KEY (brand_document_id, supplier_document_id)
)`,
    indexes: [],
  },
  {
    name: 'brand_roast_countries',
    ddl: `CREATE TABLE {t} (
  brand_document_id TEXT NOT NULL,
  country_name TEXT, country_code TEXT,
  PRIMARY KEY (brand_document_id, country_code)
)`,
    indexes: [],
  },
  {
    name: 'shops',
    ddl: `CREATE TABLE {t} (
  document_id TEXT PRIMARY KEY,
  id INTEGER, name TEXT NOT NULL, pref_name TEXT, slug TEXT,
  description TEXT, address TEXT, postal_code TEXT, neighbourhood TEXT,
  lat REAL, lng REAL,
  brand_document_id TEXT, location_document_id TEXT, city_area_document_id TEXT, country_code TEXT,
  brand_name TEXT, brand_type TEXT, brand_logo_url TEXT, brand_statement TEXT,
  location_name TEXT, location_slug TEXT, city_area_name TEXT, city_area_group TEXT,
  featured_image_url TEXT, featured_image_formats TEXT,
  gallery TEXT, menus TEXT,
  has_wifi INTEGER, has_food INTEGER, has_outdoor_space INTEGER, is_pet_friendly INTEGER,
  has_v60 INTEGER, has_chemex INTEGER, has_filter_coffee INTEGER, has_slow_bar INTEGER, has_kitchen INTEGER,
  has_espresso INTEGER, has_aeropress INTEGER, has_french_press INTEGER, has_cold_brew INTEGER, has_batch_brew INTEGER,
  is_chain INTEGER, independent INTEGER,
  city_area_rec INTEGER, city_area_rec_exp TEXT, working_rec INTEGER, interior_rec INTEGER, brewing_rec INTEGER,
  shop_promo TEXT, shop_promo_code TEXT,
  google_rating REAL, google_review_count INTEGER, rating REAL, rating_count INTEGER,
  google_place_id TEXT, google_place_verified INTEGER, google_place_last_sync TEXT, google_place_match_confidence REAL,
  google_business_status TEXT, google_photo_reference TEXT, google_formatted_address TEXT, google_plus_code TEXT,
  google_types TEXT, google_places_last_updated TEXT, google_coordinates_last_updated TEXT,
  website TEXT, phone TEXT, phone_number TEXT, instagram TEXT, facebook TEXT, tiktok TEXT,
  amenity_overrides TEXT, brew_method_overrides TEXT, menu_data TEXT,
  public_tags TEXT, amenities TEXT,
  architects TEXT, price TEXT, quality_tier TEXT, opening_hours TEXT, is_open INTEGER,
  local_density INTEGER DEFAULT 0,
  research TEXT, cited_sources TEXT, observations TEXT, vision_data TEXT, preference_profile TEXT,
  coffee_partner_document_id TEXT, coffee_partner_name TEXT, coffee_partner_logo_url TEXT,
  is_dev INTEGER DEFAULT 0, awards TEXT, source_articles TEXT,
  created_at TEXT, updated_at TEXT, published_at TEXT
)`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_shops_coords ON shops(lat, lng)',
      'CREATE INDEX IF NOT EXISTS idx_shops_brand ON shops(brand_document_id)',
      'CREATE INDEX IF NOT EXISTS idx_shops_country ON shops(country_code)',
      'CREATE INDEX IF NOT EXISTS idx_shops_location ON shops(location_document_id)',
      'CREATE INDEX IF NOT EXISTS idx_shops_slug ON shops(slug)',
    ],
  },
  {
    name: 'beans',
    ddl: `CREATE TABLE {t} (
  document_id TEXT PRIMARY KEY,
  id INTEGER, name TEXT NOT NULL, slug TEXT, type TEXT,
  roast_level TEXT, process TEXT,
  short_description TEXT, full_description TEXT, learn_more_url TEXT,
  region TEXT, farm TEXT, producer TEXT, altitude TEXT, cupping_score REAL, blend_components TEXT,
  photo_url TEXT, photo_formats TEXT,
  brand_document_id TEXT, cited_sources TEXT,
  created_at TEXT, updated_at TEXT, published_at TEXT
)`,
    indexes: ['CREATE INDEX IF NOT EXISTS idx_beans_brand ON beans(brand_document_id)'],
  },
  {
    name: 'bean_origins',
    ddl: `CREATE TABLE {t} (
  bean_document_id TEXT NOT NULL,
  country_name TEXT, country_code TEXT,
  PRIMARY KEY (bean_document_id, country_code)
)`,
    indexes: [],
  },
  {
    name: 'bean_flavor_tags',
    ddl: `CREATE TABLE {t} (
  bean_document_id TEXT NOT NULL,
  tag_document_id TEXT, tag_name TEXT NOT NULL,
  PRIMARY KEY (bean_document_id, tag_name)
)`,
    indexes: [],
  },
  {
    name: 'locations',
    ddl: `CREATE TABLE {t} (
  document_id TEXT PRIMARY KEY,
  id INTEGER, name TEXT NOT NULL, slug TEXT, story TEXT, headline TEXT,
  rating_stars REAL, population TEXT, timezone TEXT,
  in_focus INTEGER, beta INTEGER, coming_soon INTEGER,
  primary_color TEXT, secondary_color TEXT,
  coordinates TEXT, boundary_coordinates TEXT,
  bg_image_url TEXT, bg_image_formats TEXT, media_links TEXT,
  story_author_id INTEGER, story_author_document_id TEXT, story_author_name TEXT, story_author_photo_url TEXT,
  country_document_id TEXT, country_name TEXT, country_code TEXT,
  country_primary_color TEXT, country_secondary_color TEXT,
  created_at TEXT, updated_at TEXT, published_at TEXT
)`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_locations_slug ON locations(slug)',
      'CREATE INDEX IF NOT EXISTS idx_locations_country ON locations(country_code)',
    ],
  },
  {
    name: 'countries',
    ddl: `CREATE TABLE {t} (
  document_id TEXT PRIMARY KEY,
  id INTEGER, name TEXT NOT NULL, code TEXT NOT NULL, slug TEXT, story TEXT,
  supported INTEGER, coming_soon INTEGER,
  primary_color TEXT, primary_color_dark TEXT, secondary_color TEXT, secondary_color_dark TEXT,
  accent_colour TEXT, high_inflation INTEGER, producer INTEGER,
  region_document_id TEXT, region_name TEXT, region_coming_soon INTEGER,
  created_at TEXT, updated_at TEXT, published_at TEXT
)`,
    indexes: ['CREATE INDEX IF NOT EXISTS idx_countries_code ON countries(code)'],
  },
  {
    name: 'city_areas',
    ddl: `CREATE TABLE {t} (
  document_id TEXT PRIMARY KEY,
  id INTEGER, name TEXT NOT NULL, slug TEXT, area_group TEXT,
  description TEXT, summary TEXT,
  featured_image_url TEXT, featured_image_formats TEXT,
  boundary_coordinates TEXT, center_coordinates TEXT,
  postcode TEXT, nearest_tube TEXT, coming_soon INTEGER,
  location_document_id TEXT, location_name TEXT, location_slug TEXT,
  location_country_name TEXT, location_country_code TEXT,
  created_at TEXT, updated_at TEXT, published_at TEXT
)`,
    indexes: ['CREATE INDEX IF NOT EXISTS idx_city_areas_location ON city_areas(location_document_id)'],
  },
];

const ALL_TABLES: TableDef[] = [
  ...CORE_TABLES,
  ...NATIVE_TABLES.map(name => ({
    name,
    ddl: NATIVE_TABLE_DDL[name].replace('CREATE TABLE IF NOT EXISTS', 'CREATE TABLE'),
    indexes: indexesFor(name),
  })),
];

const NEXT_SUFFIX = '__next';

// ─── SQL execution helpers ─────────────────────────────────────────────────────

const BATCH_SIZE = 80; // D1 limit is 100 statements per batch, stay under

async function executeBatch(db: D1Database, statements: Array<string | D1PreparedStatement>): Promise<void> {
  for (let i = 0; i < statements.length; i += BATCH_SIZE) {
    const batch = statements.slice(i, i + BATCH_SIZE);
    await db.batch(batch.map(s => (typeof s === 'string' ? db.prepare(s) : s)));
  }
}

/** Point an `INSERT OR REPLACE INTO <table>` string at a different physical table. */
function retarget(sql: string, suffix: string): string {
  return suffix ? sql.replace(/^INSERT OR REPLACE INTO (\w+) /, `INSERT OR REPLACE INTO $1${suffix} `) : sql;
}

// ─── Loading ───────────────────────────────────────────────────────────────────

interface StrapiData {
  countries: any[];
  locations: any[];
  cityAreas: any[];
  brands: any[];
  shops: any[];
  native: Record<NativeModel, any[]>;
  shopEvents: any[];
  /** Optional models Strapi refused this run; their live rows are carried over. */
  skipped: NativeModel[];
}

const SHOP_PARAMS: Record<string, string> = {
  'populate[brand][populate]': '*',
  'populate[location][fields][0]': 'documentId',
  'populate[location][fields][1]': 'name',
  'populate[location][fields][2]': 'slug',
  'populate[city_area][fields][0]': 'documentId',
  'populate[city_area][fields][1]': 'name',
  'populate[city_area][fields][2]': 'group',
  'populate[featured_image][fields][0]': 'url',
  'populate[featured_image][fields][1]': 'formats',
  'populate[coffee_partner][populate]': '*',
};

// `populate=*` only goes one level deep, which left bean origins, flavour tags and
// photos empty after every nightly run. List every relation the builders read.
const BRAND_PARAMS: Record<string, string> = {
  'populate[logo]': 'true',
  'populate[bg-image]': 'true',
  'populate[suppliers][fields][0]': 'documentId',
  'populate[ownRoastCountry][fields][0]': 'name',
  'populate[ownRoastCountry][fields][1]': 'code',
  'populate[beans][populate][photo]': 'true',
  'populate[beans][populate][origins][fields][0]': 'name',
  'populate[beans][populate][origins][fields][1]': 'code',
  'populate[beans][populate][flavorTags][fields][0]': 'name',
};

/**
 * Fetch everything (or, with `updatedSince`, only entries edited after that time).
 * A small delay between collections avoids Strapi rate limits.
 */
async function fetchAll(env: Env, log: string[], updatedSince?: string): Promise<StrapiData> {
  const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
  const since = (params: Record<string, string>) =>
    updatedSince ? { ...params, 'filters[updatedAt][$gt]': updatedSince } : params;
  const get = async (endpoint: string, params: Record<string, string>, pageSize?: number) => {
    const rows = await fetchPaginated(env.STRAPI_URL, endpoint, env.STRAPI_TOKEN, since(params), pageSize);
    log.push(`  ${rows.length} ${endpoint}`);
    await delay(updatedSince ? 100 : 500);
    return rows;
  };

  const countries = await get('countries', { populate: '*' });
  const locations = await get('locations', { populate: '*' });
  const cityAreas = await get('city-areas', { populate: '*' }, 25);
  const brands = await get('brands', BRAND_PARAMS);
  const shops = await get('shops', SHOP_PARAMS);

  const native = {} as Record<NativeModel, any[]>;
  const skipped: NativeModel[] = [];
  for (const [model, config] of Object.entries(NATIVE_MODELS) as Array<[NativeModel, (typeof NATIVE_MODELS)[NativeModel]]>) {
    try {
      native[model] = await get(config.endpoint, { ...config.params });
    } catch (err) {
      if (!('optional' in config && config.optional)) throw err;
      log.push(`  ${config.endpoint} skipped, keeping live rows (${err instanceof Error ? err.message : String(err)})`);
      native[model] = [];
      skipped.push(model);
    }
  }
  const shopEvents = await get('shops', { ...SHOP_EVENTS_PARAMS });

  return { countries, locations, cityAreas, brands, shops, native, shopEvents, skipped };
}

/**
 * Statements that write `data` into tables named `<table><suffix>`.
 * With `replace`, rows owned by each entry (relations) are deleted first, so it can
 * run against live tables.
 */
function buildStatements(db: D1Database, data: StrapiData, suffix: string, replace: boolean): Array<string | D1PreparedStatement> {
  const out: Array<string | D1PreparedStatement> = [];
  const t = (name: string) => `${name}${suffix}`;

  for (const brand of data.brands) {
    const id = esc(brand.documentId);
    if (replace) {
      out.push(`DELETE FROM ${t('brand_suppliers')} WHERE brand_document_id = ${id};`);
      out.push(`DELETE FROM ${t('brand_roast_countries')} WHERE brand_document_id = ${id};`);
      out.push(`DELETE FROM ${t('bean_origins')} WHERE bean_document_id IN (SELECT document_id FROM ${t('beans')} WHERE brand_document_id = ${id});`);
      out.push(`DELETE FROM ${t('bean_flavor_tags')} WHERE bean_document_id IN (SELECT document_id FROM ${t('beans')} WHERE brand_document_id = ${id});`);
      out.push(`DELETE FROM ${t('beans')} WHERE brand_document_id = ${id};`);
    }

    out.push(retarget(buildBrandInsert(brand), suffix));

    for (const supplier of brand.suppliers ?? []) {
      out.push(`INSERT OR REPLACE INTO ${t('brand_suppliers')} (brand_document_id, supplier_document_id) VALUES (${id}, ${esc(supplier.documentId)});`);
    }
    for (const country of brand.ownRoastCountry ?? []) {
      if (!country.code) continue;
      out.push(`INSERT OR REPLACE INTO ${t('brand_roast_countries')} (brand_document_id, country_name, country_code) VALUES (${id}, ${esc(country.name)}, ${esc(country.code)});`);
    }
    for (const bean of brand.beans ?? []) {
      bean.brandDocumentId = brand.documentId;
      out.push(retarget(buildBeanInsert(bean), suffix));
      for (const origin of bean.origins ?? []) {
        if (!origin.code) continue;
        out.push(`INSERT OR REPLACE INTO ${t('bean_origins')} (bean_document_id, country_name, country_code) VALUES (${esc(bean.documentId)}, ${esc(origin.name)}, ${esc(origin.code)});`);
      }
      for (const tag of bean.flavorTags ?? []) {
        out.push(`INSERT OR REPLACE INTO ${t('bean_flavor_tags')} (bean_document_id, tag_document_id, tag_name) VALUES (${esc(bean.documentId)}, ${esc(tag.documentId)}, ${esc(tag.name)});`);
      }
    }
  }

  out.push(...data.shops.map(shop => retarget(buildShopInsert(shop), suffix)));
  out.push(...data.locations.map(loc => retarget(buildLocationInsert(loc), suffix)));
  out.push(...data.countries.map(country => retarget(buildCountryInsert(country), suffix)));
  out.push(...data.cityAreas.map(ca => retarget(buildCityAreaInsert(ca), suffix)));

  const nativeNames = Object.fromEntries(NATIVE_TABLES.map(name => [name, t(name)]));
  for (const [model, entries] of Object.entries(data.native) as Array<[NativeModel, any[]]>) {
    for (const entry of entries) out.push(...upsertStatements(db, model, entry, nativeNames, { clearJoins: replace }));
  }
  for (const shop of data.shopEvents) out.push(...shopEventStatements(db, shop, nativeNames, { clearJoins: replace }));

  return out;
}

// ─── Main handler ──────────────────────────────────────────────────────────────

/** Copy live rows into `__next` for optional models Strapi refused, so a permission gap never empties a table. */
async function carryOverSkipped(db: D1Database, skipped: NativeModel[], log: string[]): Promise<void> {
  for (const model of skipped) {
    const config = NATIVE_MODELS[model];
    const tables: readonly string[] = 'tables' in config ? config.tables : [];
    for (const table of tables) {
      const live = await db.prepare(`SELECT name FROM pragma_table_info('${table}')`).all<{ name: string }>();
      if (live.results.length === 0) continue;
      const next = await db.prepare(`SELECT name FROM pragma_table_info('${table}${NEXT_SUFFIX}')`).all<{ name: string }>();
      const liveCols = new Set(live.results.map(r => r.name));
      const cols = next.results.map(r => r.name).filter(c => liveCols.has(c)).join(', ');
      await db.prepare(`INSERT INTO ${table}${NEXT_SUFFIX} (${cols}) SELECT ${cols} FROM ${table}`).run();
      log.push(`  ${table}: kept live rows`);
    }
  }
}

async function handleScheduled(env: Env): Promise<string> {
  const log: string[] = [];
  const start = Date.now();
  const startedAt = new Date(start).toISOString();

  log.push(`[${startedAt}] Starting D1 reseed...`);

  // 1. Fetch everything from Strapi before touching D1.
  log.push('Fetching data from Strapi...');
  const data = await fetchAll(env, log);

  // 2. Build fresh copies alongside the live tables.
  log.push('Creating __next tables...');
  for (const table of ALL_TABLES) {
    const next = `${table.name}${NEXT_SUFFIX}`;
    await env.DB.prepare(`DROP TABLE IF EXISTS ${next}`).run();
    await env.DB.prepare(table.ddl.replace('{t}', next)).run();
  }

  log.push('Filling __next tables...');
  const statements = buildStatements(env.DB, data, NEXT_SUFFIX, false);
  await executeBatch(env.DB, statements);
  log.push(`  ${statements.length} statements`);
  await carryOverSkipped(env.DB, data.skipped, log);

  // 3. Swap in one transaction.
  log.push('Swapping tables...');
  const swap: string[] = [];
  for (const table of ALL_TABLES) {
    swap.push(`DROP TABLE IF EXISTS ${table.name}`);
    swap.push(`ALTER TABLE ${table.name}${NEXT_SUFFIX} RENAME TO ${table.name}`);
    swap.push(...table.indexes);
  }
  await env.DB.batch(swap.map(sql => env.DB.prepare(sql)));

  // 4. Webhook writes that landed in the old tables during the run were dropped with
  //    them. Re-apply anything edited since we started fetching.
  log.push(`Replaying edits since ${startedAt}...`);
  const changed = await fetchAll(env, log, startedAt);
  const replay = buildStatements(env.DB, changed, '', true);
  await executeBatch(env.DB, replay);
  log.push(`  ${replay.length} statements`);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  log.push(`Done in ${elapsed}s.`);

  return log.join('\n');
}

// ─── Worker exports ────────────────────────────────────────────────────────────

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      handleScheduled(env).then(log => {
        console.log(log);
      }).catch(err => {
        console.error('D1 reseed failed:', err);
      })
    );
  },

  // HTTP endpoint for manual triggering. Runs to completion inside the request and
  // returns the log: `waitUntil` work is cancelled 30 s after the response, which is
  // shorter than a reseed. Keep the connection open (e.g. `curl --max-time 600`).
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/reseed') {
      const secret = request.headers.get('x-reseed-secret');
      if (!env.RESEED_SECRET || secret !== env.RESEED_SECRET) {
        return new Response('Unauthorized', { status: 401, headers: { 'Content-Type': 'text/plain' } });
      }

      try {
        const log = await handleScheduled(env);
        console.log(log);
        return new Response(log, { status: 200, headers: { 'Content-Type': 'text/plain' } });
      } catch (err) {
        console.error('D1 reseed failed:', err);
        return new Response(`D1 reseed failed: ${err instanceof Error ? err.message : String(err)}`, {
          status: 500,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
    }

    return new Response('D1 Reseed Worker\n\nGET /reseed - run a reseed and return its log (requires x-reseed-secret header; takes about a minute)\n\nCron: 0 3 * * * (daily at 3am UTC)', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  },
};
