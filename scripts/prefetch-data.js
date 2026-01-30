/**
 * Pre-fetch all Strapi data before build
 * Run this before `npm run build` to avoid hammering the API
 */

const fs = require('fs');
const path = require('path');

// Output directory for bundled data (will be imported at build time)
const LIB_DATA_DIR = path.join(__dirname, '../lib/data');
// Output directory for static JSON files (served from CDN)
const PUBLIC_DATA_DIR = path.join(__dirname, '../public/data');

// Use production Strapi if USE_PROD=1 or NEXT_PUBLIC_STRAPI_URL_PROD is set
const useProd = process.env.USE_PROD === '1';
const STRAPI_URL = useProd
  ? (process.env.NEXT_PUBLIC_STRAPI_URL_PROD || 'https://helpful-oasis-8bb949e05d.strapiapp.com/api')
  : (process.env.NEXT_PUBLIC_STRAPI_URL || 'https://helpful-oasis-8bb949e05d.strapiapp.com/api');
const STRAPI_TOKEN = useProd
  ? process.env.NEXT_PUBLIC_STRAPI_TOKEN_PROD
  : process.env.NEXT_PUBLIC_STRAPI_TOKEN;

if (!STRAPI_TOKEN) {
  console.warn(useProd
    ? '⚠️  NEXT_PUBLIC_STRAPI_TOKEN_PROD not set - skipping prefetch (data will be fetched at runtime)'
    : '⚠️  NEXT_PUBLIC_STRAPI_TOKEN not set - skipping prefetch (data will be fetched at runtime)');
  process.exit(0); // Exit gracefully - prefetch is optional
}

if (useProd) {
  console.log('Using PRODUCTION Strapi\n');
}

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${STRAPI_TOKEN}`,
};

async function fetchPaginated(endpoint, params = '') {
  const allData = [];
  let page = 1;
  let pageCount = 1;

  while (page <= pageCount) {
    const url = `${STRAPI_URL}/${endpoint}?${params}&pagination[pageSize]=100&pagination[page]=${page}`;
    console.log(`  Fetching ${endpoint} page ${page}...`);

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${endpoint}: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    allData.push(...(json.data || []));

    pageCount = json.meta?.pagination?.pageCount || 1;
    page++;

    // Small delay to be gentle on the API
    await new Promise(r => setTimeout(r, 100));
  }

  return allData;
}

async function fetchAll(endpoint, params = '') {
  const url = `${STRAPI_URL}/${endpoint}?${params}&pagination[pageSize]=100`;
  console.log(`  Fetching ${endpoint}...`);

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${endpoint}: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  return json.data || [];
}

async function main() {
  console.log('Pre-fetching Strapi data...\n');

  const dataDir = path.join(__dirname, '../.data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  try {
    // Fetch shops with relations
    // Note: Strapi v5 has issues with explicit brand[fields] combined with brand[populate]
    // So we fetch brands separately and merge them after
    console.log('1. Fetching shops...');
    const shopPopulate = [
      // Brand - simple populate, we'll merge full data from brands fetch later
      'populate[brand][populate][logo][fields][0]=url',
      'populate[brand][populate][logo][fields][1]=formats',
      // Shop's own coffee_partner (can override brand's)
      'populate[coffee_partner][populate][0]=logo',
      'populate[coffee_partner][populate][1]=bg-image',
      'populate[coffee_partner][populate][2]=country',
      // Shop images
      'populate[featured_image]=*',
      'populate[gallery]=*',
      // Populate city_area with all fields including group
      'populate[city_area][fields][0]=id',
      'populate[city_area][fields][1]=documentId',
      'populate[city_area][fields][2]=name',
      'populate[city_area][fields][3]=slug',
      'populate[city_area][fields][4]=group',
      'populate[city_area][fields][5]=description',
      'populate[city_area][fields][6]=summary',
      'populate[city_area][populate][location]=*',
      'populate[city_area][populate][location][populate][country]=*',
      'populate[city_area][populate][location][populate][background_image]=*',
      // Populate direct location with full data
      'populate[location]=*',
      'populate[location][populate][country]=*',
      'populate[location][populate][background_image]=*',
    ].join('&');
    let shops = await fetchPaginated('shops', shopPopulate);
    console.log(`   ✓ ${shops.length} shops (brand data will be merged after brands fetch)\n`);

    // Fetch regions first (countries reference these)
    console.log('2. Fetching regions...');
    const regions = await fetchAll('regions');
    fs.writeFileSync(path.join(dataDir, 'regions.json'), JSON.stringify(regions, null, 2));
    console.log(`   ✓ ${regions.length} regions\n`);

    // Fetch countries with region relation populated (use paginated - there are 200+ countries)
    console.log('3. Fetching countries...');
    const countryPopulate = [
      'populate[region][fields][0]=id',
      'populate[region][fields][1]=documentId',
      'populate[region][fields][2]=Name',
      'populate[region][fields][3]=comingSoon',
    ].join('&');
    const countries = await fetchPaginated('countries', countryPopulate);
    fs.writeFileSync(path.join(dataDir, 'countries.json'), JSON.stringify(countries, null, 2));
    console.log(`   ✓ ${countries.length} countries\n`);

    // Fetch city areas with locations
    // Note: Strapi v5 doesn't allow mixing populate[location][fields] with populate[location][populate]
    // Use * for location to get all fields, then nest country/background_image populates
    console.log('4. Fetching city areas...');
    const cityAreaPopulate = [
      'populate[location]=*',
      'populate[location][populate][country]=*',
      'populate[location][populate][background_image]=*',
    ].join('&');
    const cityAreas = await fetchPaginated('city-areas', cityAreaPopulate);
    fs.writeFileSync(path.join(dataDir, 'city-areas.json'), JSON.stringify(cityAreas, null, 2));
    console.log(`   ✓ ${cityAreas.length} city areas\n`);

    // Fetch tags
    console.log('5. Fetching tags...');
    const tags = await fetchAll('tags');
    fs.writeFileSync(path.join(dataDir, 'tags.json'), JSON.stringify(tags, null, 2));
    console.log(`   ✓ ${tags.length} tags\n`);

    // Fetch locations directly (not all locations have city areas)
    console.log('5b. Fetching locations...');
    const locationPopulate = [
      'populate[country][fields][0]=documentId',
      'populate[country][fields][1]=name',
      'populate[country][fields][2]=code',
      'populate[country][fields][3]=primaryColor',
      'populate[country][fields][4]=secondaryColor',
      'populate[background_image][fields][0]=url',
      'populate[background_image][fields][1]=formats',
    ].join('&');
    const locations = await fetchPaginated('locations', locationPopulate);
    fs.writeFileSync(path.join(dataDir, 'locations.json'), JSON.stringify(locations, null, 2));
    console.log(`   ✓ ${locations.length} locations\n`);

    // Fetch brands with nested relations
    // Note: Keep this simple - Strapi v5 can be finicky with deep nested populates
    console.log('6. Fetching brands...');
    const brandPopulate = [
      'populate[logo][fields][0]=url',
      'populate[logo][fields][1]=formats',
      'populate[suppliers][populate][logo][fields][0]=url',
      'populate[suppliers][populate][logo][fields][1]=formats',
      'populate[suppliers][populate][country][fields][0]=name',
      'populate[suppliers][populate][country][fields][1]=code',
      'populate[suppliers][populate][ownRoastCountry][fields][0]=name',
      'populate[suppliers][populate][ownRoastCountry][fields][1]=code',
      'populate[ownRoastCountry][fields][0]=name',
      'populate[ownRoastCountry][fields][1]=code',
    ].join('&');
    const brands = await fetchPaginated('brands', brandPopulate);
    fs.writeFileSync(path.join(dataDir, 'brands.json'), JSON.stringify(brands, null, 2));
    console.log(`   ✓ ${brands.length} brands\n`);

    // Merge full brand data into shops
    // This is necessary because Strapi v5 has issues with explicit fields+populate on nested relations
    console.log('6b. Merging full brand data into shops...');
    const brandMap = new Map();
    for (const brand of brands) {
      brandMap.set(brand.documentId, brand);
    }

    let mergedCount = 0;
    shops = shops.map(shop => {
      if (shop.brand?.documentId) {
        const fullBrand = brandMap.get(shop.brand.documentId);
        if (fullBrand) {
          // Merge full brand data, preserving shop-level logo if it was populated
          const shopBrandLogo = shop.brand.logo;
          shop.brand = { ...fullBrand };
          // Use the shop's populated logo if it had better data
          if (shopBrandLogo && (!fullBrand.logo || shopBrandLogo.url)) {
            shop.brand.logo = shopBrandLogo;
          }
          mergedCount++;
        }
      }
      return shop;
    });
    console.log(`   ✓ Merged brand data for ${mergedCount} shops\n`);

    // Now save the shops with merged brand data
    fs.writeFileSync(path.join(dataDir, 'shops.json'), JSON.stringify(shops, null, 2));

    // Also generate a TypeScript module for bundling (Cloudflare Workers don't have fs access)
    console.log('7. Generating bundled data module...');
    if (!fs.existsSync(LIB_DATA_DIR)) {
      fs.mkdirSync(LIB_DATA_DIR, { recursive: true });
    }

    // Generate a minimal placeholder module (not the actual data)
    // The actual data is served from static JSON files in public/data/
    // This avoids bloating the server bundle which has a 25MB limit on Cloudflare Pages
    const moduleContent = `// AUTO-GENERATED by scripts/prefetch-data.js - DO NOT EDIT
// This is a PLACEHOLDER module - actual data is served from /data/*.json (CDN)
// We don't bundle data here to keep server function under Cloudflare's 25MB limit

/* eslint-disable @typescript-eslint/no-explicit-any */

// Empty arrays - data is fetched from static JSON files or Strapi API
export const prefetchedShops: any[] = [];
export const prefetchedCountries: any[] = [];
export const prefetchedCityAreas: any[] = [];
export const prefetchedBrands: any[] = [];

export const PREFETCH_TIMESTAMP = ${Date.now()};

// Stats from last prefetch (for reference only):
// Shops: ${shops.length}, Regions: ${regions.length}, Countries: ${countries.length}, City Areas: ${cityAreas.length}, Brands: ${brands.length}, Tags: ${tags.length}
`;

    fs.writeFileSync(path.join(LIB_DATA_DIR, 'prefetched.ts'), moduleContent);
    console.log('   ✓ Generated lib/data/prefetched.ts\n');

    // Also write to public/data/ for CDN serving (faster than API routes)
    console.log('8. Generating static JSON files for CDN...');
    if (!fs.existsSync(PUBLIC_DATA_DIR)) {
      fs.mkdirSync(PUBLIC_DATA_DIR, { recursive: true });
    }

    // Write minified JSON (no pretty print - smaller files)
    fs.writeFileSync(path.join(PUBLIC_DATA_DIR, 'shops.json'), JSON.stringify(shops));
    fs.writeFileSync(path.join(PUBLIC_DATA_DIR, 'regions.json'), JSON.stringify(regions));
    fs.writeFileSync(path.join(PUBLIC_DATA_DIR, 'countries.json'), JSON.stringify(countries));
    fs.writeFileSync(path.join(PUBLIC_DATA_DIR, 'city-areas.json'), JSON.stringify(cityAreas));
    fs.writeFileSync(path.join(PUBLIC_DATA_DIR, 'brands.json'), JSON.stringify(brands));
    fs.writeFileSync(path.join(PUBLIC_DATA_DIR, 'tags.json'), JSON.stringify(tags));
    fs.writeFileSync(path.join(PUBLIC_DATA_DIR, 'locations.json'), JSON.stringify(locations));

    console.log('   ✓ Generated public/data/*.json files\n');

    console.log('✅ All data pre-fetched successfully!');
    console.log(`   JSON saved to ${dataDir}/`);
    console.log(`   Module saved to ${LIB_DATA_DIR}/prefetched.ts`);
    console.log(`   Static files saved to ${PUBLIC_DATA_DIR}/`);

  } catch (error) {
    console.error('❌ Error pre-fetching data:', error.message);
    process.exit(1);
  }
}

main();
