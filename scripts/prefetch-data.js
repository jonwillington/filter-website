/**
 * Pre-fetch all Strapi data before build
 * Run this before `npm run build` to avoid hammering the API
 */

const fs = require('fs');
const path = require('path');

/**
 * Calculate distance between two coordinates using Haversine formula.
 * @returns Distance in kilometers
 */
function calculateDistance(point1, point2) {
  const [lng1, lat1] = point1;
  const [lng2, lat2] = point2;

  const toRad = (deg) => deg * Math.PI / 180;
  const R = 6371; // Earth's radius in km

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Get coordinates from a shop for density calculation.
 */
function getShopCoordsForDensity(shop) {
  if (shop.coordinates?.lng && shop.coordinates?.lat) {
    return [shop.coordinates.lng, shop.coordinates.lat];
  }
  if (shop.longitude && shop.latitude) {
    return [shop.longitude, shop.latitude];
  }
  return null;
}

/**
 * Pre-calculate local density for all shops.
 * This is O(n²) but runs once at build time, not on every request.
 */
function calculateAllDensities(shops, radiusKm = 1.5) {
  const densities = new Map();

  // Build coordinate lookup for efficiency
  const coordsMap = new Map();
  for (const shop of shops) {
    const coords = getShopCoordsForDensity(shop);
    if (coords) {
      coordsMap.set(shop.documentId, coords);
    }
  }

  // Calculate density for each shop
  for (const shop of shops) {
    const coords = coordsMap.get(shop.documentId);
    if (!coords) {
      densities.set(shop.documentId, 0);
      continue;
    }

    let nearbyCount = 0;
    // Iterate through all shops to find nearby ones
    for (const otherShop of shops) {
      if (otherShop.documentId === shop.documentId) continue;

      const otherCoords = coordsMap.get(otherShop.documentId);
      if (!otherCoords) continue;

      const distance = calculateDistance(coords, otherCoords);
      if (distance <= radiusKm) {
        nearbyCount++;
      }
    }

    densities.set(shop.documentId, nearbyCount);
  }

  return densities;
}

// Output directory for bundled data (will be imported at build time)
const LIB_DATA_DIR = path.join(__dirname, '../lib/data');
// Output directory for static JSON files (served from CDN)
const PUBLIC_DATA_DIR = path.join(__dirname, '../public/data');

// Always use production Strapi for prefetch - this data is committed and used in production builds
const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL_PROD || 'https://helpful-oasis-8bb949e05d.strapiapp.com/api';
const STRAPI_TOKEN = process.env.NEXT_PUBLIC_STRAPI_TOKEN_PROD;

if (!STRAPI_TOKEN) {
  console.error('❌ NEXT_PUBLIC_STRAPI_TOKEN_PROD not set - cannot prefetch data. Aborting build.');
  process.exit(1);
}

// Skip prefetch if data already exists (avoids double-fetch during OpenNext build)
const shopsJsonPath = path.join(PUBLIC_DATA_DIR, 'shops.json');
if (fs.existsSync(path.join(__dirname, '../.open-next-building')) && fs.existsSync(shopsJsonPath)) {
  console.log('⏭️  Skipping prefetch - data already exists (OpenNext inner build)');
  process.exit(0);
}

console.log('Using PRODUCTION Strapi\n');

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${STRAPI_TOKEN}`,
};

async function fetchWithRetry(url, options, retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const response = await fetch(url, options);
    if (response.ok) return response;
    if (attempt < retries && response.status >= 500) {
      const delay = 3000 * attempt;
      console.log(`    Retry ${attempt}/${retries - 1} after ${response.status} (waiting ${delay / 1000}s)...`);
      await new Promise(r => setTimeout(r, delay));
      continue;
    }
    throw new Error(`${response.status} ${response.statusText}`);
  }
}

async function fetchPaginated(endpoint, params = '', { pageSize = 100, delayMs = 100 } = {}) {
  const allData = [];
  let page = 1;
  let pageCount = 1;

  while (page <= pageCount) {
    const url = `${STRAPI_URL}/${endpoint}?${params}&pagination[pageSize]=${pageSize}&pagination[page]=${page}`;
    console.log(`  Fetching ${endpoint} page ${page}...`);

    const response = await fetchWithRetry(url, { headers });
    const json = await response.json();
    allData.push(...(json.data || []));

    pageCount = json.meta?.pagination?.pageCount || 1;
    page++;

    // Delay to be gentle on the API
    await new Promise(r => setTimeout(r, delayMs));
  }

  return allData;
}

async function fetchAll(endpoint, params = '') {
  const url = `${STRAPI_URL}/${endpoint}?${params}&pagination[pageSize]=100`;
  console.log(`  Fetching ${endpoint}...`);

  const response = await fetchWithRetry(url, { headers });
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

    // Fetch city areas with locations and boundary data
    // Note: Strapi v5 doesn't allow mixing populate[location][fields] with populate[location][populate]
    // Use * for location to get all fields, then nest country/background_image populates
    console.log('4. Fetching city areas...');
    const cityAreaPopulate = [
      'populate=*',  // Get all fields including boundary_coordinates JSON
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

    // Fetch events with city relation
    console.log('5c. Fetching events...');
    const eventPopulate = 'populate=city&populate=image&populate=eventHostBrand.logo';
    const events = await fetchAll('events', eventPopulate);
    fs.writeFileSync(path.join(dataDir, 'events.json'), JSON.stringify(events, null, 2));
    console.log(`   ✓ ${events.length} events\n`);

    // Fetch people (formerly critics) with relations
    console.log('5d. Fetching people...');
    const personPopulate = 'populate=photo&populate=locations&populate=person_picks.shop.featured_image&populate=person_picks.shop.brand.logo&populate=person_picks.shop.city_area&populate=affiliated_shop.featured_image&populate=affiliated_shop.brand.logo&populate=affiliated_shop.city_area&populate=affiliated_shop.location.country';
    const people = await fetchAll('people', personPopulate);
    fs.writeFileSync(path.join(dataDir, 'people.json'), JSON.stringify(people, null, 2));
    console.log(`   ✓ ${people.length} people\n`);

    // Fetch news articles
    console.log('5e. Fetching news articles...');
    const newsPopulate = 'populate=featured_image&populate=source.logo&populate=brands_mentioned.logo&populate=shops_mentioned.brand.logo&populate=shops_mentioned.featured_image&populate=shops_mentioned.location&populate=people_mentioned&populate=locations_mentioned';
    const newsArticles = await fetchAll('news-articles', newsPopulate);
    fs.writeFileSync(path.join(dataDir, 'news-articles.json'), JSON.stringify(newsArticles, null, 2));
    console.log(`   ✓ ${newsArticles.length} news articles\n`);

    // Fetch brands with nested relations
    // Note: Keep this simple - Strapi v5 can be finicky with deep nested populates
    console.log('6. Fetching brands...');
    const brandPopulate = [
      'populate[logo][fields][0]=url',
      'populate[logo][fields][1]=formats',
      'populate[bg-image][fields][0]=url',
      'populate[bg-image][fields][1]=formats',
      'populate[suppliers][populate][logo][fields][0]=url',
      'populate[suppliers][populate][logo][fields][1]=formats',
      'populate[suppliers][populate][country][fields][0]=name',
      'populate[suppliers][populate][country][fields][1]=code',
      'populate[suppliers][populate][ownRoastCountry][fields][0]=name',
      'populate[suppliers][populate][ownRoastCountry][fields][1]=code',
      'populate[ownRoastCountry][fields][0]=name',
      'populate[ownRoastCountry][fields][1]=code',
    ].join('&');
    let brands = await fetchPaginated('brands', brandPopulate);
    console.log(`   ✓ ${brands.length} brands\n`);

    // Fetch beans separately (Strapi v5 doesn't handle deep nested populates well)
    console.log('6b. Fetching beans...');
    const beansPopulate = [
      'populate[brand][fields][0]=documentId',
      'populate[origins][fields][0]=id',
      'populate[origins][fields][1]=documentId',
      'populate[origins][fields][2]=name',
      'populate[origins][fields][3]=code',
      'populate[flavorTags][fields][0]=id',
      'populate[flavorTags][fields][1]=documentId',
      'populate[flavorTags][fields][2]=name',
      'populate[photo][fields][0]=url',
      'populate[photo][fields][1]=formats',
    ].join('&');
    const beans = await fetchPaginated('beans', beansPopulate, { pageSize: 50, delayMs: 500 });
    console.log(`   ✓ ${beans.length} beans\n`);

    // Group beans by brand documentId
    console.log('6c. Merging beans into brands...');
    const beansByBrand = new Map();
    for (const bean of beans) {
      const brandDocId = bean.brand?.documentId;
      if (brandDocId) {
        if (!beansByBrand.has(brandDocId)) {
          beansByBrand.set(brandDocId, []);
        }
        // Remove brand from bean to avoid circular reference
        const { brand, ...beanWithoutBrand } = bean;
        beansByBrand.get(brandDocId).push(beanWithoutBrand);
      }
    }

    // Merge beans into brands
    let beansAddedCount = 0;
    brands = brands.map(brand => {
      const brandBeans = beansByBrand.get(brand.documentId) || [];
      if (brandBeans.length > 0) {
        beansAddedCount += brandBeans.length;
      }
      return { ...brand, beans: brandBeans };
    });
    console.log(`   ✓ Added ${beansAddedCount} beans to brands\n`);

    fs.writeFileSync(path.join(dataDir, 'brands.json'), JSON.stringify(brands, null, 2));

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

    // Merge city_area group field into shops (Strapi v5 doesn't include all fields with nested populate)
    // Try to use public/data/city-areas.json first if it has groups (from production), fallback to fetched data
    console.log('6c. Merging city_area groups into shops...');
    let cityAreasWithGroups = cityAreas;
    try {
      const publicCityAreas = JSON.parse(fs.readFileSync(path.join(PUBLIC_DATA_DIR, 'city-areas.json'), 'utf8'));
      const hasGroups = publicCityAreas.some(a => a.group);
      if (hasGroups) {
        console.log('   Using city-areas from public/data (has groups)');
        cityAreasWithGroups = publicCityAreas;
      }
    } catch (e) {
      // No public data, use fetched data
    }

    const cityAreaMap = new Map();
    for (const area of cityAreasWithGroups) {
      cityAreaMap.set(area.documentId, area);
    }

    let cityAreaMergedCount = 0;
    shops = shops.map(shop => {
      const shopCityArea = shop.city_area || shop.cityArea;
      if (shopCityArea?.documentId) {
        const fullCityArea = cityAreaMap.get(shopCityArea.documentId);
        if (fullCityArea) {
          // Only add the group field to avoid bloating the data
          shop.city_area = {
            ...shopCityArea,
            group: fullCityArea.group || null,
          };
          cityAreaMergedCount++;
        }
      }
      return shop;
    });
    console.log(`   ✓ Merged city_area groups for ${cityAreaMergedCount} shops\n`);

    // Pre-calculate local density for all shops (O(n²) but runs once at build time)
    console.log('6d. Calculating local densities...');
    const densities = calculateAllDensities(shops);
    for (const shop of shops) {
      shop.localDensity = densities.get(shop.documentId) ?? 0;
    }
    const shopsWithDensity = shops.filter(s => s.localDensity > 0).length;
    console.log(`   ✓ Calculated densities for ${shops.length} shops (${shopsWithDensity} have nearby shops)\n`);

    // Now save the shops with merged brand, city_area, and density data
    fs.writeFileSync(path.join(dataDir, 'shops.json'), JSON.stringify(shops, null, 2));

    // Also generate a TypeScript module for bundling (Cloudflare Workers don't have fs access)
    console.log('7. Generating bundled data module...');
    if (!fs.existsSync(LIB_DATA_DIR)) {
      fs.mkdirSync(LIB_DATA_DIR, { recursive: true });
    }

    // Bundle small datasets directly (locations, countries, stripped city-areas)
    // so Cloudflare Workers can access them without filesystem or Strapi calls.
    // Large datasets (shops, brands) stay empty — loaded via D1 or static JSON on client.
    const strippedCityAreas = cityAreas.map(({ shops, boundary_coordinates, ...rest }) => rest);

    const moduleContent = `// AUTO-GENERATED by scripts/prefetch-data.js - DO NOT EDIT
// Small datasets are bundled here for Cloudflare Workers (no fs access).
// Large datasets (shops, brands) are served from D1 or /data/*.json (CDN).

/* eslint-disable @typescript-eslint/no-explicit-any */

// Empty - loaded via D1 or static JSON on client side
export const prefetchedShops: any[] = [];
export const prefetchedBrands: any[] = [];

// Bundled - small enough to include, needed for server-side route validation
export const prefetchedCountries: any[] = ${JSON.stringify(countries)};
export const prefetchedCityAreas: any[] = ${JSON.stringify(strippedCityAreas)};
export const prefetchedLocations: any[] = ${JSON.stringify(locations)};

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
    // Write slim shops (only essential brand fields) to keep under Cloudflare Pages 25 MiB limit
    // Full brand data is in brands.json and merged client-side
    const slimShops = shops.map(shop => {
      if (shop.brand) {
        return {
          ...shop,
          brand: {
            documentId: shop.brand.documentId,
            name: shop.brand.name,
            type: shop.brand.type,
            logo: shop.brand.logo,
            statement: shop.brand.statement,
          }
        };
      }
      return shop;
    });
    fs.writeFileSync(path.join(PUBLIC_DATA_DIR, 'shops.json'), JSON.stringify(slimShops));
    fs.writeFileSync(path.join(PUBLIC_DATA_DIR, 'regions.json'), JSON.stringify(regions));
    fs.writeFileSync(path.join(PUBLIC_DATA_DIR, 'countries.json'), JSON.stringify(countries));
    fs.writeFileSync(path.join(PUBLIC_DATA_DIR, 'city-areas.json'), JSON.stringify(cityAreas));
    fs.writeFileSync(path.join(PUBLIC_DATA_DIR, 'brands.json'), JSON.stringify(brands));
    fs.writeFileSync(path.join(PUBLIC_DATA_DIR, 'tags.json'), JSON.stringify(tags));
    fs.writeFileSync(path.join(PUBLIC_DATA_DIR, 'locations.json'), JSON.stringify(locations));
    fs.writeFileSync(path.join(PUBLIC_DATA_DIR, 'events.json'), JSON.stringify(events));
    fs.writeFileSync(path.join(PUBLIC_DATA_DIR, 'people.json'), JSON.stringify(people));
    fs.writeFileSync(path.join(PUBLIC_DATA_DIR, 'news-articles.json'), JSON.stringify(newsArticles));

    console.log('   ✓ Generated public/data/*.json files\n');

    console.log('✅ All data pre-fetched successfully!');
    console.log(`   JSON saved to ${dataDir}/`);
    console.log(`   Module saved to ${LIB_DATA_DIR}/prefetched.ts`);
    console.log(`   Static files saved to ${PUBLIC_DATA_DIR}/`);

  } catch (error) {
    console.error('❌ Error pre-fetching data:', error.message);

    // If existing static data files are present, continue the build with stale data
    // rather than failing entirely. D1 serves fresh data at runtime anyway.
    if (fs.existsSync(path.join(PUBLIC_DATA_DIR, 'shops.json')) &&
        fs.existsSync(path.join(PUBLIC_DATA_DIR, 'locations.json'))) {
      console.log('⚠️  Using existing static data files (may be stale). Build will continue.');
      console.log('   D1 serves fresh shop data at runtime, so this is safe.');
    } else {
      console.error('❌ No existing data files found. Cannot continue build.');
      process.exit(1);
    }
  }
}

main();
