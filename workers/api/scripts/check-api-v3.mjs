// Contract check for the v3 API: hits every endpoint and validates each response
// against the shapes in types/api-v3.ts. Fails if a field goes missing or changes type.
//
// Usage:
//   node scripts/check-api-v3.mjs                          # http://localhost:8787, istanbul
//   API_BASE=https://api.filter.coffee CITY=istanbul node scripts/check-api-v3.mjs

const BASE = (process.env.API_BASE ?? 'http://localhost:8787').replace(/\/$/, '');
const CITY = process.env.CITY ?? 'istanbul';
const MAX_CATALOG_GZIP_BYTES = 300_000;

// ─── Tiny schema language ─────────────────────────────────────────────────────
// A schema is: 'string' | 'number' | 'boolean' | 'unknown' | ['nullable', s] | ['array', s]
// | ['enum', ...values] | { key: schema } (every key required, extra keys allowed).

const errors = [];

function check(value, schema, path) {
  if (Array.isArray(schema)) {
    const [kind, ...rest] = schema;
    if (kind === 'nullable') return value === null || check(value, rest[0], path);
    if (kind === 'array') {
      if (!Array.isArray(value)) return fail(path, 'array', value);
      value.forEach((item, i) => check(item, rest[0], `${path}[${i}]`));
      return true;
    }
    if (kind === 'enum') return rest.includes(value) || fail(path, `one of ${rest.join('|')}`, value);
  }
  if (schema === 'unknown') return value !== undefined || fail(path, 'present', value);
  if (typeof schema === 'string') return typeof value === schema || fail(path, schema, value);

  if (value === null || typeof value !== 'object' || Array.isArray(value)) return fail(path, 'object', value);
  for (const [key, sub] of Object.entries(schema)) {
    if (!(key in value)) {
      errors.push(`${path}.${key}: missing`);
      continue;
    }
    check(value[key], sub, `${path}.${key}`);
  }
  return true;
}

function fail(path, expected, value) {
  const got = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  errors.push(`${path}: expected ${expected}, got ${got}`);
  return false;
}

const n = s => ['nullable', s];
const arr = s => ['array', s];

// ─── Schemas (mirror types/api-v3.ts) ─────────────────────────────────────────

const Coordinates = { lat: 'number', lng: 'number' };
const Bounds = { north: 'number', south: 'number', east: 'number', west: 'number' };
const Variant = { url: 'string', width: n('number'), height: n('number') };
const Image = {
  url: 'string',
  width: n('number'),
  height: n('number'),
  formats: { thumbnail: n(Variant), small: n(Variant), medium: n(Variant), large: n(Variant) },
};
const SocialLinks = {
  website: n('string'), instagram: n('string'), facebook: n('string'),
  tiktok: n('string'), twitter: n('string'), youtube: n('string'),
};
const OpeningHours = {
  days: arr({
    weekday: ['enum', 1, 2, 3, 4, 5, 6, 7],
    status: ['enum', 'open', 'closed', 'open24h', 'unknown'],
    ranges: arr({ open: 'string', close: 'string' }),
    text: n('string'),
  }),
};

const Meta = { version: 'string', generatedAt: 'string' };
const envelope = data => ({ data, meta: Meta });

const CityListItem = { id: 'string', slug: 'string', name: 'string', countryCode: n('string'), shopCount: 'number' };

const CityArea = {
  id: 'string', slug: n('string'), name: 'string', group: n('string'), summary: n('string'),
  center: n(Coordinates), bounds: n(Bounds), boundary: n(arr(Coordinates)), shopCount: 'number',
};
const City = {
  id: 'string', slug: 'string', name: 'string', headline: n('string'), story: n('string'),
  timezone: n('string'), center: n(Coordinates), bounds: n(Bounds), boundary: n(arr(Coordinates)),
  backgroundImage: n(Image), primaryColor: n('string'), secondaryColor: n('string'),
  country: {
    id: 'string', code: n('string'), name: 'string', primaryColor: n('string'), primaryColorDark: n('string'),
    secondaryColor: n('string'), secondaryColorDark: n('string'), highInflation: n('boolean'),
  },
  cityAreas: arr(CityArea),
};

const bools = keys => Object.fromEntries(keys.map(k => [k, n('boolean')]));
const ShopSummary = {
  id: 'string', slug: n('string'), name: 'string', brandId: n('string'), cityId: n('string'), cityAreaId: n('string'),
  coordinates: n(Coordinates), address: n('string'), heroImage: n(Image), openingHours: n(OpeningHours),
  amenities: bools(['wifi', 'food', 'outdoorSeating', 'petFriendly', 'oatMilk', 'plantMilk']),
  brewMethods: bools(['espresso', 'filter', 'v60', 'chemex', 'aeropress', 'frenchPress', 'coldBrew', 'batchBrew', 'siphon', 'turkishCoffee', 'slowBar']),
  recommendations: { cityArea: n('boolean'), cityAreaReason: n('string'), working: n('boolean'), interior: n('boolean'), brewing: n('boolean') },
  qualityTier: n('string'), preferenceProfile: n('unknown'), updatedAt: n('string'),
};
const BrandSummary = {
  id: 'string', name: 'string', type: n('string'), statement: n('string'), logo: n(Image),
  roastsOwnBeans: n('boolean'), supplierIds: arr('string'),
};
const Event = {
  id: 'string', name: 'string', description: n('string'), type: n('string'), startsAt: n('string'), endsAt: n('string'),
  cityId: n('string'), venue: n('string'), website: n('string'), isFree: n('boolean'), ticketPrice: n('number'),
  ticketsAvailable: n('boolean'), image: n(Image), hostBrandId: n('string'), shopIds: arr('string'),
};
const ShopDetail = {
  ...ShopSummary,
  description: n('string'), neighbourhood: n('string'), phone: n('string'), links: SocialLinks, googlePlaceId: n('string'),
  gallery: arr(Image),
  menus: arr({ id: 'string', image: n(Image), isCurrent: n('boolean'), validFrom: n('string'), validTo: n('string'), lastVerified: n('string') }),
  brand: n(BrandSummary),
  cityArea: n({ id: 'string', name: 'string', group: n('string') }),
  coffeePartner: n({ id: 'string', name: 'string', logo: n(Image), countryCode: n('string'), primaryCategory: n('string'), website: n('string'), instagram: n('string') }),
  events: arr(Event),
};
const CountryRef = { name: n('string'), code: n('string') };
const BrandDetail = {
  ...BrandSummary,
  story: n('string'), description: n('string'), founded: n('string'), founder: n('string'), hq: n('string'),
  backgroundImage: n(Image), links: SocialLinks, ownRoastDescription: n('string'), ownRoastCountries: arr(CountryRef),
  roastProfiles: { light: n('boolean'), medium: n('boolean'), dark: n('boolean') },
  equipment: n('unknown'),
  beans: arr({
    id: 'string', name: 'string', slug: n('string'), type: n('string'), roastLevel: n('string'), process: n('string'),
    shortDescription: n('string'), fullDescription: n('string'), region: n('string'), farm: n('string'),
    producer: n('string'), altitude: n('string'), cuppingScore: n('number'), blendComponents: n('unknown'),
    photo: n(Image), learnMoreUrl: n('string'), origins: arr(CountryRef), flavorTags: arr({ id: n('string'), name: 'string' }),
  }),
  suppliers: arr(BrandSummary),
  shopsByCity: arr({
    cityId: n('string'), cityName: n('string'), citySlug: n('string'),
    shops: arr({ id: 'string', name: 'string', cityAreaName: n('string'), coordinates: n(Coordinates), heroImage: n(Image) }),
  }),
};
const Person = {
  id: 'string', name: 'string', slug: n('string'), bio: n('string'), photo: n(Image), roles: arr('string'),
  affiliation: n('string'), affiliatedShopId: n('string'), links: SocialLinks,
};
const Discover = {
  cityId: 'string',
  events: arr(Event),
  people: arr({ ...Person, picks: arr({ id: 'string', shopId: 'string', rank: n('number'), description: n('string') }) }),
  news: arr({
    id: 'string', title: 'string', slug: n('string'), statement: n('string'), summary: n('string'), publishedDate: n('string'),
    type: n('string'), importance: n('string'), sourceName: n('string'), sourceUrl: n('string'), author: n('string'),
    image: n(Image), brandIds: arr('string'), shopIds: arr('string'), cityIds: arr('string'),
  }),
  brands: arr(BrandSummary),
};
const ErrorBody = { error: { code: 'string', message: 'string' } };

// ─── Run ──────────────────────────────────────────────────────────────────────

async function get(path, headers = {}) {
  const started = Date.now();
  const res = await fetch(`${BASE}${path}`, { headers: { 'Accept-Encoding': 'gzip', ...headers } });
  const text = res.status === 304 ? '' : await res.text();
  return { res, text, body: text ? JSON.parse(text) : null, ms: Date.now() - started };
}

async function endpoint(label, path, schema, expectStatus = 200) {
  const { res, text, body, ms } = await get(path);
  const before = errors.length;
  if (res.status !== expectStatus) errors.push(`${label}: expected HTTP ${expectStatus}, got ${res.status}`);
  else check(body, schema, label);
  if (expectStatus === 200 && !res.headers.get('etag')) errors.push(`${label}: missing ETag`);
  const status = errors.length === before ? 'ok ' : 'FAIL';
  console.log(`${status} ${String(res.status).padEnd(3)} ${String(ms).padStart(5)} ms ${String(text.length).padStart(8)} B  ${path}  [${res.headers.get('x-api-cache') ?? '-'}]`);
  return { res, body, text };
}

const cities = await endpoint('cities', '/v3/cities', envelope(arr(CityListItem)));
if (!cities.body?.data?.some(c => c.slug === CITY)) errors.push(`cities: ${CITY} not listed`);

const city = await endpoint('city', `/v3/cities/${CITY}`, envelope(City));
const cityById = await endpoint('cityById', `/v3/cities/${city.body?.data?.id}`, envelope(City));
if (cityById.body?.data?.slug !== CITY) errors.push('cityById: documentId lookup did not resolve to the same city');

const catalog = await endpoint('catalog', `/v3/cities/${CITY}/catalog`, envelope({ cityId: 'string', shops: arr(ShopSummary), brands: arr(BrandSummary) }));
const shops = catalog.body?.data?.shops ?? [];
const brandIds = new Set((catalog.body?.data?.brands ?? []).map(b => b.id));
for (const s of shops) if (s.brandId && !brandIds.has(s.brandId)) errors.push(`catalog: shop ${s.id} brandId ${s.brandId} not in brands[]`);
if (shops.length === 0) errors.push('catalog: no shops');

const { gzipSync } = await import('node:zlib');
const gz = gzipSync(catalog.text ?? '').length;
console.log(`     catalog: ${shops.length} shops, ${brandIds.size} brands, ${(gz / 1024).toFixed(1)} KB gzipped`);
if (gz > MAX_CATALOG_GZIP_BYTES) errors.push(`catalog: ${gz} bytes gzipped exceeds ${MAX_CATALOG_GZIP_BYTES}`);

// 304 on a matching ETag.
const etag = catalog.res.headers.get('etag');
const revalidated = await get(`/v3/cities/${CITY}/catalog`, { 'If-None-Match': etag });
if (revalidated.res.status !== 304) errors.push(`catalog: If-None-Match expected 304, got ${revalidated.res.status}`);
else console.log(`ok  304 ${String(revalidated.ms).padStart(5)} ms                 If-None-Match`);

const sample = shops.find(s => s.brandId) ?? shops[0];
if (sample) await endpoint('shop', `/v3/shops/${sample.id}`, envelope(ShopDetail));
if (sample?.brandId) await endpoint('brand', `/v3/brands/${sample.brandId}`, envelope(BrandDetail));

await endpoint('discover', `/v3/cities/${CITY}/discover?events=5&news=5`, envelope(Discover));

await endpoint('city404', '/v3/cities/definitely-not-a-city', ErrorBody, 404);
await endpoint('shop404', '/v3/shops/definitely-not-a-shop', ErrorBody, 404);
await endpoint('route404', '/v3/nothing-here', ErrorBody, 404);

if (errors.length > 0) {
  console.error(`\n${errors.length} contract error(s):`);
  for (const e of errors.slice(0, 50)) console.error(`  - ${e}`);
  process.exit(1);
}
console.log('\nContract check passed.');
