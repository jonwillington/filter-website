import type {
  BrandDetail,
  BrandSummary,
  Catalog,
  City,
  CityArea,
  CityListItem,
  Discover,
  NearbyAttraction,
  PersonWithPicks,
  ShopDetail,
} from '../../../types/api-v3';
import { boundsOf, distanceMetres, distanceToLine, medianPoint, parseOutline, parsePoint, simplifyOutline } from './geo';
import {
  BRAND_SUMMARY_COLUMNS,
  SHOP_SUMMARY_COLUMNS,
  attraction,
  bean,
  brandSummary,
  coffeePartner,
  event,
  gallery,
  groupBy,
  menus,
  newsArticle,
  person,
  shopSummary,
} from './mappers';
import { bool, image, links, num, plainText, str, type Row } from './values';

/* eslint-disable @typescript-eslint/no-explicit-any */

const NOT_DEV = 'IFNULL(is_dev, 0) = 0';
const CITY_OUTLINE_POINTS = 150;
const AREA_OUTLINE_POINTS = 100;

async function all(db: D1Database, sql: string, ...binds: unknown[]): Promise<Row[]> {
  const result = await db.prepare(sql).bind(...binds).all<Row>();
  return result.results;
}

async function first(db: D1Database, sql: string, ...binds: unknown[]): Promise<Row | null> {
  return db.prepare(sql).bind(...binds).first<Row>();
}

/** Bind a list for `IN (SELECT value FROM json_each(?n))`. Avoids D1's 100-parameter limit. */
function list(ids: Iterable<string>): string {
  return JSON.stringify([...new Set(ids)]);
}

// ─── Table availability ───────────────────────────────────────────────────────

let tableCache: { at: number; names: Set<string> } | null = null;

/** Phase 2 tables may not exist yet (migration not applied). Endpoints degrade to empty lists. */
export async function existingTables(db: D1Database): Promise<Set<string>> {
  if (tableCache && Date.now() - tableCache.at < 60_000) return tableCache.names;
  const rows = await all(db, "SELECT name FROM sqlite_master WHERE type = 'table'");
  tableCache = { at: Date.now(), names: new Set(rows.map(r => r.name as string)) };
  return tableCache.names;
}

// ─── Shared lookups ───────────────────────────────────────────────────────────

export async function findCity(db: D1Database, key: string): Promise<Row | null> {
  return first(db, 'SELECT * FROM locations WHERE slug = ?1 OR document_id = ?1 LIMIT 1', key);
}

/** Brand summaries for the given IDs, with supplier IDs. Pass `withSuppliers` to also load the suppliers themselves. */
async function brandSummaries(
  db: D1Database,
  ids: Iterable<string>,
  withSuppliers: boolean,
): Promise<{ summaries: BrandSummary[]; rows: Map<string, Row> }> {
  const wanted = list(ids);
  const [brandRows, supplierLinks] = await Promise.all([
    all(db, `SELECT ${BRAND_SUMMARY_COLUMNS} FROM brands WHERE document_id IN (SELECT value FROM json_each(?1)) AND ${NOT_DEV}`, wanted),
    all(db, 'SELECT brand_document_id, supplier_document_id FROM brand_suppliers WHERE brand_document_id IN (SELECT value FROM json_each(?1))', wanted),
  ]);

  const rows = new Map(brandRows.map(r => [r.document_id as string, r]));

  if (withSuppliers) {
    const missing = supplierLinks.map(l => l.supplier_document_id as string).filter(id => !rows.has(id));
    if (missing.length > 0) {
      const supplierRows = await all(
        db,
        `SELECT ${BRAND_SUMMARY_COLUMNS} FROM brands WHERE document_id IN (SELECT value FROM json_each(?1)) AND ${NOT_DEV}`,
        list(missing),
      );
      for (const r of supplierRows) rows.set(r.document_id as string, r);
    }
  }

  const suppliersByBrand = groupBy(supplierLinks, 'brand_document_id', l => l.supplier_document_id as string);
  const summaries = [...rows.values()]
    .map(r => {
      // Only list supplier IDs that resolve to a brand the client can see.
      const supplierIds = (suppliersByBrand.get(r.document_id) ?? []).filter(id => rows.has(id));
      return brandSummary(r, supplierIds);
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return { summaries, rows };
}

// ─── Attractions ──────────────────────────────────────────────────────────────

/** How far away an attraction can still count as nearby, by prominence (1 = famous landmark). */
const NEARBY_RADIUS_M: Record<number, number> = { 1: 1200, 2: 800, 3: 500 };
const NEARBY_LIMIT = 3;
/** Streets wind: straight-line distance × 1.25, walked at 80 m a minute. */
const WALK_DETOUR = 1.25;
const WALK_M_PER_MIN = 80;

async function cityAttractions(db: D1Database, cityId: string): Promise<Row[]> {
  const tables = await existingTables(db);
  if (!tables.has('attractions')) return [];
  return all(
    db,
    `SELECT a.*, ca.area_group AS area_group FROM attractions a
     LEFT JOIN city_areas ca ON ca.document_id = a.city_area_document_id
     WHERE a.location_document_id = ?1
     ORDER BY IFNULL(a.prominence, 2), a.name`,
    cityId,
  );
}

/**
 * Attractions within walking distance of a shop. Skips any on the other side of the
 * water: when both city-area groups are known they must match ("European Side" vs "Asian Side").
 */
function nearbyAttractions(shop: Row, shopGroup: string | null, rows: Row[]): NearbyAttraction[] {
  const lat = num(shop.lat);
  const lng = num(shop.lng);
  if (lat === null || lng === null) return [];
  const here = { lat, lng };

  const nearby: NearbyAttraction[] = [];
  for (const row of rows) {
    const group = str(row.area_group);
    if (shopGroup && group && group !== shopGroup) continue;

    const outline = parseOutline(row.outline);
    const aLat = num(row.lat);
    const aLng = num(row.lng);
    const metres = outline && outline.length > 1
      ? distanceToLine(here, outline)
      : aLat !== null && aLng !== null
        ? distanceMetres(here, { lat: aLat, lng: aLng })
        : null;
    if (metres === null) continue;

    const prominence = num(row.prominence) ?? 2;
    if (metres > (NEARBY_RADIUS_M[prominence] ?? NEARBY_RADIUS_M[3])) continue;

    nearby.push({
      id: row.document_id,
      name: str(row.name)?.trim() ?? '',
      localName: str(row.local_name),
      category: str(row.category),
      prominence,
      distanceMetres: Math.round(metres / 10) * 10,
      walkMinutes: Math.max(1, Math.round((metres * WALK_DETOUR) / WALK_M_PER_MIN)),
    });
  }

  return nearby
    .sort((a, b) => a.prominence - b.prominence || a.distanceMetres - b.distanceMetres)
    .slice(0, NEARBY_LIMIT);
}

function upcomingCutoff(): string {
  return new Date().toISOString();
}

// ─── /v3/cities ───────────────────────────────────────────────────────────────

export async function listCities(db: D1Database): Promise<CityListItem[]> {
  const rows = await all(
    db,
    `SELECT l.document_id, l.slug, l.name, c.code AS country_code,
            (SELECT COUNT(*) FROM shops s WHERE s.location_document_id = l.document_id AND IFNULL(s.is_dev, 0) = 0) AS shop_count
     FROM locations l
     LEFT JOIN countries c ON c.document_id = l.country_document_id
     WHERE l.slug IS NOT NULL
     ORDER BY l.name`,
  );
  return rows.map(r => ({
    id: r.document_id,
    slug: r.slug,
    name: r.name,
    countryCode: str(r.country_code),
    shopCount: num(r.shop_count) ?? 0,
  }));
}

// ─── /v3/cities/:city ─────────────────────────────────────────────────────────

export async function getCity(db: D1Database, location: Row, fullBoundaries: boolean): Promise<City> {
  const [country, areaRows, shopPoints, areaCounts] = await Promise.all([
    first(db, 'SELECT * FROM countries WHERE document_id = ?1', location.country_document_id),
    all(db, 'SELECT * FROM city_areas WHERE location_document_id = ?1 ORDER BY area_group, name', location.document_id),
    all(db, `SELECT lat, lng FROM shops WHERE location_document_id = ?1 AND lat IS NOT NULL AND lng IS NOT NULL AND ${NOT_DEV}`, location.document_id),
    all(db, `SELECT city_area_document_id AS id, COUNT(*) AS n FROM shops WHERE location_document_id = ?1 AND ${NOT_DEV} GROUP BY city_area_document_id`, location.document_id),
  ]);

  const counts = new Map(areaCounts.map(r => [r.id as string, num(r.n) ?? 0]));
  const shopCoordinates = shopPoints.map(p => ({ lat: Number(p.lat), lng: Number(p.lng) }));

  // Locations keep their outline in `coordinates`; `boundary_coordinates` is usually empty.
  const outline = parseOutline(location.boundary_coordinates) ?? parseOutline(location.coordinates);

  const cityAreas: CityArea[] = areaRows.map(a => {
    const areaOutline = parseOutline(a.boundary_coordinates);
    return {
      id: a.document_id,
      slug: str(a.slug),
      name: str(a.name) ?? '',
      group: str(a.area_group),
      summary: plainText(a.summary),
      center: parsePoint(a.center_coordinates),
      bounds: areaOutline ? boundsOf(areaOutline) : null,
      boundary: areaOutline ? (fullBoundaries ? areaOutline : simplifyOutline(areaOutline, AREA_OUTLINE_POINTS)) : null,
      shopCount: counts.get(a.document_id) ?? 0,
    };
  });

  return {
    id: location.document_id,
    slug: location.slug,
    name: location.name,
    headline: str(location.headline),
    story: plainText(location.story),
    timezone: str(location.timezone),
    center: medianPoint(shopCoordinates) ?? (outline ? centerOf(outline) : null),
    bounds: boundsOf(shopCoordinates) ?? (outline ? boundsOf(outline) : null),
    boundary: outline ? (fullBoundaries ? outline : simplifyOutline(outline, CITY_OUTLINE_POINTS)) : null,
    backgroundImage: image(location.bg_image_url, location.bg_image_formats),
    primaryColor: str(location.primary_color),
    secondaryColor: str(location.secondary_color),
    country: {
      id: str(country?.document_id) ?? str(location.country_document_id) ?? '',
      code: str(country?.code) ?? str(location.country_code),
      name: str(country?.name) ?? str(location.country_name) ?? '',
      primaryColor: str(country?.primary_color),
      primaryColorDark: str(country?.primary_color_dark),
      secondaryColor: str(country?.secondary_color),
      secondaryColorDark: str(country?.secondary_color_dark),
      highInflation: bool(country?.high_inflation),
    },
    cityAreas,
  };
}

function centerOf(points: { lat: number; lng: number }[]) {
  const b = boundsOf(points);
  return b ? { lat: (b.north + b.south) / 2, lng: (b.east + b.west) / 2 } : null;
}

// ─── /v3/cities/:city/catalog ─────────────────────────────────────────────────

export async function getCatalog(db: D1Database, location: Row): Promise<Catalog> {
  const shopRows = await all(
    db,
    `SELECT ${SHOP_SUMMARY_COLUMNS} FROM shops WHERE location_document_id = ?1 AND ${NOT_DEV} ORDER BY name`,
    location.document_id,
  );

  const brandIds = shopRows.map(s => s.brand_document_id).filter((id): id is string => typeof id === 'string');
  const [{ summaries, rows: brandRows }, attractionRows] = await Promise.all([
    brandSummaries(db, brandIds, true),
    cityAttractions(db, location.document_id),
  ]);

  return {
    cityId: location.document_id,
    shops: shopRows.map(s => shopSummary(s, brandRows.get(s.brand_document_id) ?? null)),
    brands: summaries,
    attractions: attractionRows.map(attraction),
  };
}

// ─── /v3/shops/:id ────────────────────────────────────────────────────────────

export async function getShop(db: D1Database, id: string): Promise<ShopDetail | null> {
  const shop = await first(db, `SELECT * FROM shops WHERE document_id = ?1 AND ${NOT_DEV}`, id);
  if (!shop) return null;

  const tables = await existingTables(db);
  const brandId = str(shop.brand_document_id);
  const partnerId = str(shop.coffee_partner_document_id);

  const [brandFull, brandSummaryResult, area, partner, eventRows, attractionRows] = await Promise.all([
    brandId ? first(db, `SELECT website, instagram, facebook, tiktok, twitter, youtube, phone FROM brands WHERE document_id = ?1`, brandId) : null,
    brandId ? brandSummaries(db, [brandId], false) : null,
    shop.city_area_document_id
      ? first(db, 'SELECT document_id, name, area_group FROM city_areas WHERE document_id = ?1', shop.city_area_document_id)
      : null,
    partnerId && tables.has('coffee_partners') ? first(db, 'SELECT * FROM coffee_partners WHERE document_id = ?1', partnerId) : null,
    tables.has('shop_events') && tables.has('events')
      ? all(
          db,
          `SELECT e.* FROM events e JOIN shop_events se ON se.event_document_id = e.document_id
           WHERE se.shop_document_id = ?1 AND COALESCE(e.end_date, e.start_date) >= ?2
           ORDER BY e.start_date`,
          id,
          upcomingCutoff(),
        )
      : [],
    shop.location_document_id ? cityAttractions(db, shop.location_document_id) : [],
  ]);

  const brandRow = brandSummaryResult?.rows.get(brandId ?? '') ?? null;
  const eventShopLinks = eventRows.length
    ? await all(
        db,
        'SELECT event_document_id, shop_document_id FROM shop_events WHERE event_document_id IN (SELECT value FROM json_each(?1))',
        list(eventRows.map(e => e.document_id)),
      )
    : [];
  const shopsByEvent = groupBy(eventShopLinks, 'event_document_id', l => l.shop_document_id as string);

  return {
    ...shopSummary(shop, brandRow),
    description: plainText(shop.description),
    neighbourhood: str(shop.neighbourhood),
    phone: str(shop.phone_number) ?? str(shop.phone) ?? str(brandFull?.phone),
    links: links(shop, brandFull),
    googlePlaceId: str(shop.google_place_id),
    gallery: gallery(shop.gallery),
    menus: menus(shop.menus),
    brand: brandSummaryResult?.summaries[0] ?? null,
    cityArea: area ? { id: area.document_id, name: str(area.name) ?? '', group: str(area.area_group) } : null,
    coffeePartner: partner
      ? coffeePartner(partner)
      : partnerId
        ? {
            id: partnerId,
            name: str(shop.coffee_partner_name) ?? '',
            logo: image(shop.coffee_partner_logo_url, null),
            countryCode: null,
            primaryCategory: null,
            website: null,
            instagram: null,
          }
        : null,
    events: eventRows.map(e => event(e, shopsByEvent.get(e.document_id) ?? [])),
    nearbyAttractions: nearbyAttractions(shop, str(area?.area_group), attractionRows),
  };
}

// ─── /v3/brands/:id ───────────────────────────────────────────────────────────

export async function getBrand(db: D1Database, id: string): Promise<BrandDetail | null> {
  const brand = await first(db, `SELECT * FROM brands WHERE document_id = ?1 AND ${NOT_DEV}`, id);
  if (!brand) return null;

  const [beanRows, roastCountries, supplierLinks, shopRows] = await Promise.all([
    all(db, 'SELECT * FROM beans WHERE brand_document_id = ?1 ORDER BY name', id),
    all(db, 'SELECT country_name, country_code FROM brand_roast_countries WHERE brand_document_id = ?1 ORDER BY country_name', id),
    all(db, 'SELECT supplier_document_id FROM brand_suppliers WHERE brand_document_id = ?1', id),
    all(
      db,
      `SELECT s.document_id, s.name, s.pref_name, s.lat, s.lng, s.city_area_name, s.location_document_id,
              COALESCE(l.name, s.location_name) AS location_name, COALESCE(l.slug, s.location_slug) AS location_slug,
              s.featured_image_url, s.featured_image_formats
       FROM shops s LEFT JOIN locations l ON l.document_id = s.location_document_id
       WHERE s.brand_document_id = ?1 AND IFNULL(s.is_dev, 0) = 0
       ORDER BY location_name, s.name`,
      id,
    ),
  ]);

  const beanIds = list(beanRows.map(b => b.document_id));
  const supplierIds = supplierLinks.map(l => l.supplier_document_id as string);

  const [origins, tags, suppliers] = await Promise.all([
    beanRows.length
      ? all(db, 'SELECT bean_document_id, country_name, country_code FROM bean_origins WHERE bean_document_id IN (SELECT value FROM json_each(?1))', beanIds)
      : [],
    beanRows.length
      ? all(db, 'SELECT bean_document_id, tag_document_id, tag_name FROM bean_flavor_tags WHERE bean_document_id IN (SELECT value FROM json_each(?1)) ORDER BY tag_name', beanIds)
      : [],
    supplierIds.length ? brandSummaries(db, supplierIds, false) : null,
  ]);

  const originsByBean = groupBy(origins, 'bean_document_id', r => r);
  const tagsByBean = groupBy(tags, 'bean_document_id', r => r);
  const visibleSupplierIds = supplierIds.filter(sid => suppliers?.rows.has(sid));

  const cities = new Map<string, BrandDetail['shopsByCity'][number]>();
  for (const s of shopRows) {
    const key = str(s.location_document_id) ?? '';
    let group = cities.get(key);
    if (!group) {
      group = { cityId: str(s.location_document_id), cityName: str(s.location_name), citySlug: str(s.location_slug), shops: [] };
      cities.set(key, group);
    }
    const lat = num(s.lat);
    const lng = num(s.lng);
    group.shops.push({
      id: s.document_id,
      name: str(s.name)?.trim() ?? '',
      prefName: str(s.pref_name)?.trim() || null,
      cityAreaName: str(s.city_area_name),
      coordinates: lat !== null && lng !== null ? { lat, lng } : null,
      heroImage: image(s.featured_image_url, s.featured_image_formats),
    });
  }

  return {
    ...brandSummary(brand, visibleSupplierIds),
    story: plainText(brand.story),
    description: plainText(brand.description),
    founded: str(brand.founded),
    founder: str(brand.founder),
    hq: str(brand.hq),
    backgroundImage: image(brand.bg_image_url, brand.bg_image_formats),
    links: links(brand),
    ownRoastDescription: str(brand.own_roast_desc),
    ownRoastCountries: roastCountries.map(c => ({ name: str(c.country_name), code: str(c.country_code) })),
    roastProfiles: {
      light: bool(brand.specializes_light),
      medium: bool(brand.specializes_medium),
      dark: bool(brand.specializes_dark),
    },
    equipment: equipment(brand.equipment),
    beans: beanRows.map(b => bean(b, originsByBean.get(b.document_id) ?? [], tagsByBean.get(b.document_id) ?? [])),
    suppliers: suppliers?.summaries ?? [],
    shopsByCity: [...cities.values()],
  };
}

function equipment(value: unknown): Record<string, string[]> | null {
  let parsed: unknown = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const out: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
    if (Array.isArray(v)) out[k] = v.filter((x): x is string => typeof x === 'string');
    else if (typeof v === 'string') out[k] = [v];
  }
  return out;
}

// ─── /v3/cities/:city/discover ────────────────────────────────────────────────

export async function getDiscover(
  db: D1Database,
  location: Row,
  limits: { events: number; news: number },
): Promise<Discover> {
  const tables = await existingTables(db);
  const cityId = location.document_id as string;
  const now = upcomingCutoff();

  const [eventRows, pickRows, newsRows] = await Promise.all([
    tables.has('events')
      ? all(
          db,
          `SELECT * FROM events WHERE location_document_id = ?1 AND COALESCE(end_date, start_date) >= ?2
           ORDER BY start_date LIMIT ?3`,
          cityId,
          now,
          limits.events,
        )
      : [],
    tables.has('person_picks') && tables.has('people')
      ? all(
          db,
          `SELECT pp.* FROM person_picks pp
           JOIN shops s ON s.document_id = pp.shop_document_id
           WHERE s.location_document_id = ?1 AND IFNULL(s.is_dev, 0) = 0
           ORDER BY pp.rank IS NULL, pp.rank, pp.document_id`,
          cityId,
        )
      : [],
    tables.has('news_articles')
      ? all(
          db,
          `SELECT * FROM news_articles WHERE document_id IN (
             SELECT article_document_id FROM news_article_locations WHERE location_document_id = ?1
             UNION
             SELECT nas.article_document_id FROM news_article_shops nas
               JOIN shops s ON s.document_id = nas.shop_document_id
               WHERE s.location_document_id = ?1 AND IFNULL(s.is_dev, 0) = 0
             UNION
             SELECT nab.article_document_id FROM news_article_brands nab
               WHERE nab.brand_document_id IN (
                 SELECT brand_document_id FROM shops WHERE location_document_id = ?1 AND IFNULL(is_dev, 0) = 0
               )
           )
           ORDER BY published_date DESC, document_id LIMIT ?2`,
          cityId,
          limits.news,
        )
      : [],
  ]);

  const eventIds = list(eventRows.map(e => e.document_id));
  const articleIds = list(newsRows.map(n => n.document_id));
  const personIds = list(pickRows.map(p => p.person_document_id).filter(Boolean));

  const [eventShops, peopleRows, newsBrands, newsShops, newsCities] = await Promise.all([
    eventRows.length && tables.has('shop_events')
      ? all(db, 'SELECT event_document_id, shop_document_id FROM shop_events WHERE event_document_id IN (SELECT value FROM json_each(?1))', eventIds)
      : [],
    pickRows.length ? all(db, 'SELECT * FROM people WHERE document_id IN (SELECT value FROM json_each(?1)) ORDER BY name', personIds) : [],
    newsRows.length ? all(db, 'SELECT article_document_id, brand_document_id FROM news_article_brands WHERE article_document_id IN (SELECT value FROM json_each(?1))', articleIds) : [],
    newsRows.length ? all(db, 'SELECT article_document_id, shop_document_id FROM news_article_shops WHERE article_document_id IN (SELECT value FROM json_each(?1))', articleIds) : [],
    newsRows.length ? all(db, 'SELECT article_document_id, location_document_id FROM news_article_locations WHERE article_document_id IN (SELECT value FROM json_each(?1))', articleIds) : [],
  ]);

  const shopsByEvent = groupBy(eventShops, 'event_document_id', r => r.shop_document_id as string);
  const brandsByArticle = groupBy(newsBrands, 'article_document_id', r => r.brand_document_id as string);
  const shopsByArticle = groupBy(newsShops, 'article_document_id', r => r.shop_document_id as string);
  const citiesByArticle = groupBy(newsCities, 'article_document_id', r => r.location_document_id as string);
  const picksByPerson = groupBy(pickRows, 'person_document_id', r => ({
    id: r.document_id as string,
    shopId: r.shop_document_id as string,
    rank: num(r.rank),
    description: plainText(r.description),
  }));

  const people: PersonWithPicks[] = peopleRows.map(p => ({ ...person(p), picks: picksByPerson.get(p.document_id) ?? [] }));

  const referencedBrands = [
    ...eventRows.map(e => e.host_brand_document_id),
    ...newsBrands.map(n => n.brand_document_id),
  ].filter((id): id is string => typeof id === 'string');
  const brands = referencedBrands.length ? (await brandSummaries(db, referencedBrands, false)).summaries : [];

  return {
    cityId,
    events: eventRows.map(e => event(e, shopsByEvent.get(e.document_id) ?? [])),
    people,
    news: newsRows.map(n =>
      newsArticle(
        n,
        brandsByArticle.get(n.document_id) ?? [],
        shopsByArticle.get(n.document_id) ?? [],
        citiesByArticle.get(n.document_id) ?? [],
      ),
    ),
    brands,
  };
}
