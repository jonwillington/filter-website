/**
 * Fetch all D1-backed data from Strapi production
 *
 * Downloads shops, brands, city-areas, locations, countries (with all relations)
 * and saves to .data/*.json for seed-d1.js to consume.
 *
 * Usage:
 *   node scripts/fetch-strapi-for-d1.js
 *
 * Requires NEXT_PUBLIC_STRAPI_TOKEN_PROD in .env.local
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../.data');
const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL_PROD || 'https://helpful-oasis-8bb949e05d.strapiapp.com/api';
const STRAPI_TOKEN = process.env.NEXT_PUBLIC_STRAPI_TOKEN_PROD;

if (!STRAPI_TOKEN) {
  // Try fallback env var names
  const fallback = process.env.STRAPI_TOKEN;
  if (!fallback) {
    console.error('❌ NEXT_PUBLIC_STRAPI_TOKEN_PROD (or STRAPI_TOKEN) not set');
    process.exit(1);
  }
}

const TOKEN = STRAPI_TOKEN || process.env.STRAPI_TOKEN;

const headers = {
  'Authorization': `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

async function fetchPaginated(endpoint, params = {}, overridePageSize) {
  const allData = [];
  let page = 1;
  const pageSize = overridePageSize || 100;

  while (true) {
    const url = new URL(`${STRAPI_URL}/${endpoint}`);
    url.searchParams.set('pagination[page]', page);
    url.searchParams.set('pagination[pageSize]', pageSize);

    for (const [key, val] of Object.entries(params)) {
      url.searchParams.set(key, val);
    }

    const res = await fetch(url.toString(), { headers });
    if (!res.ok) {
      throw new Error(`Failed to fetch ${endpoint} page ${page}: ${res.status} ${res.statusText}`);
    }

    const json = await res.json();
    const data = json.data || [];
    allData.push(...data);

    // NOTE: Strapi's cached responses strip `pageCount`/`page`/`pageSize` from
    // the pagination meta and leave only `total`, so we can't rely on
    // `page >= pagination.pageCount`. Break when we've collected the expected
    // total, or when this page came back short (last page).
    const pagination = json.meta?.pagination;
    const total = pagination?.total;
    if (
      !pagination ||
      data.length === 0 ||
      data.length < pageSize ||
      (typeof total === 'number' && allData.length >= total) ||
      (pagination.pageCount && page >= pagination.pageCount)
    ) break;
    page++;
  }

  return allData;
}

async function main() {
  console.log('📥 Fetching all D1 data from Strapi...\n');

  // Ensure data dir exists
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  // 1. Countries
  console.log('  Fetching countries...');
  const countries = await fetchPaginated('countries', {
    'populate': '*',
  });
  fs.writeFileSync(path.join(DATA_DIR, 'countries.json'), JSON.stringify(countries, null, 2));
  console.log(`  ✓ ${countries.length} countries`);

  // 2. Locations
  // NOTE: `populate=*` returns the country relation without `code` (Strapi v5
  // only includes a default subset for nested relations). We need `code` so
  // that D1's locations.country_code is populated and downstream consumers
  // (e.g. the explore modal's "By region" grouping) can resolve the country.
  console.log('  Fetching locations...');
  const locations = await fetchPaginated('locations', {
    'populate[country][populate]': '*',
    'populate[background_image]': 'true',
    'populate[storyAuthor][populate][photo]': 'true',
  });
  fs.writeFileSync(path.join(DATA_DIR, 'locations.json'), JSON.stringify(locations, null, 2));
  console.log(`  ✓ ${locations.length} locations`);

  // 3. City areas (smaller pages — boundary_coordinates are large)
  console.log('  Fetching city areas...');
  const cityAreas = await fetchPaginated('city-areas', {
    'populate': '*',
  }, 10);
  fs.writeFileSync(path.join(DATA_DIR, 'city-areas.json'), JSON.stringify(cityAreas, null, 2));
  console.log(`  ✓ ${cityAreas.length} city areas`);

  // 4. Brands
  console.log('  Fetching brands...');
  const brands = await fetchPaginated('brands', {
    'populate': '*',
  });
  fs.writeFileSync(path.join(DATA_DIR, 'brands.json'), JSON.stringify(brands, null, 2));
  console.log(`  ✓ ${brands.length} brands`);

  // 5. Shops (biggest - needs all relations populated)
  console.log('  Fetching shops...');
  const shops = await fetchPaginated('shops', {
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
  });
  fs.writeFileSync(path.join(DATA_DIR, 'shops.json'), JSON.stringify(shops, null, 2));
  console.log(`  ✓ ${shops.length} shops`);

  console.log('\n✅ All data saved to .data/');
}

main().catch(e => {
  console.error('❌ ' + e.message);
  process.exit(1);
});
