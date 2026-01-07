/**
 * Pre-fetch all Strapi data before build
 * Run this before `npm run build` to avoid hammering the API
 */

const fs = require('fs');
const path = require('path');

// Use production Strapi if USE_PROD=1 or NEXT_PUBLIC_STRAPI_URL_PROD is set
const useProd = process.env.USE_PROD === '1';
const STRAPI_URL = useProd
  ? (process.env.NEXT_PUBLIC_STRAPI_URL_PROD || 'https://helpful-oasis-8bb949e05d.strapiapp.com/api')
  : (process.env.NEXT_PUBLIC_STRAPI_URL || 'https://helpful-oasis-8bb949e05d.strapiapp.com/api');
const STRAPI_TOKEN = useProd
  ? process.env.NEXT_PUBLIC_STRAPI_TOKEN_PROD
  : process.env.NEXT_PUBLIC_STRAPI_TOKEN;

if (!STRAPI_TOKEN) {
  console.error(useProd
    ? 'Error: NEXT_PUBLIC_STRAPI_TOKEN_PROD is required (set in .env.local)'
    : 'Error: NEXT_PUBLIC_STRAPI_TOKEN is required');
  process.exit(1);
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
    // Fetch shops with all relations
    console.log('1. Fetching shops...');
    const shopPopulate = [
      'populate[brand][fields][0]=name',
      'populate[brand][fields][1]=type',
      'populate[brand][fields][2]=description',
      'populate[brand][fields][3]=story',
      'populate[brand][fields][4]=website',
      'populate[brand][fields][5]=instagram',
      'populate[brand][fields][6]=has_wifi',
      'populate[brand][fields][7]=has_food',
      'populate[brand][fields][8]=has_outdoor_space',
      'populate[brand][fields][9]=is_pet_friendly',
      'populate[brand][fields][10]=has_espresso',
      'populate[brand][fields][11]=has_filter_coffee',
      'populate[brand][fields][12]=roastOwnBeans',
      'populate[brand][populate][logo]=*',
      'populate[brand][populate][suppliers][populate][logo]=*',
      'populate[brand][populate][suppliers][populate][country]=*',
      'populate[brand][populate][coffee_partner][populate][logo]=*',
      'populate[brand][populate][coffee_partner][populate][country]=*',
      'populate[featured_image]=*',
      'populate[gallery]=*',
      'populate[city_area][fields][0]=id',
      'populate[city_area][fields][1]=documentId',
      'populate[city_area][fields][2]=name',
      'populate[city_area][fields][3]=slug',
      'populate[city_area][fields][4]=group',
      'populate[city_area][populate][location]=*',
      'populate[city_area][populate][location][populate][country]=*',
      'populate[city_area][populate][location][populate][background_image]=*',
      'populate[location]=*',
      'populate[location][populate][country]=*',
      'populate[location][populate][background_image]=*',
    ].join('&');
    const shops = await fetchPaginated('shops', shopPopulate);
    fs.writeFileSync(path.join(dataDir, 'shops.json'), JSON.stringify(shops, null, 2));
    console.log(`   ✓ ${shops.length} shops\n`);

    // Fetch countries
    console.log('2. Fetching countries...');
    const countries = await fetchAll('countries');
    fs.writeFileSync(path.join(dataDir, 'countries.json'), JSON.stringify(countries, null, 2));
    console.log(`   ✓ ${countries.length} countries\n`);

    // Fetch city areas with locations
    console.log('3. Fetching city areas...');
    const cityAreaPopulate = [
      'populate[location][populate][country]=*',
      'populate[location][populate][background_image]=*',
      'populate[location][fields][0]=id',
      'populate[location][fields][1]=documentId',
      'populate[location][fields][2]=name',
      'populate[location][fields][3]=coordinates',
      'populate[location][fields][4]=rating_stars',
      'populate[location][fields][5]=headline',
      'populate[location][fields][6]=story',
    ].join('&');
    const cityAreas = await fetchPaginated('city-areas', cityAreaPopulate);
    fs.writeFileSync(path.join(dataDir, 'city-areas.json'), JSON.stringify(cityAreas, null, 2));
    console.log(`   ✓ ${cityAreas.length} city areas\n`);

    // Fetch brands
    console.log('4. Fetching brands...');
    const brandPopulate = 'populate=*';
    const brands = await fetchPaginated('brands', brandPopulate);
    fs.writeFileSync(path.join(dataDir, 'brands.json'), JSON.stringify(brands, null, 2));
    console.log(`   ✓ ${brands.length} brands\n`);

    console.log('✅ All data pre-fetched successfully!');
    console.log(`   Data saved to ${dataDir}/`);

  } catch (error) {
    console.error('❌ Error pre-fetching data:', error.message);
    process.exit(1);
  }
}

main();
