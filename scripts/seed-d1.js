/**
 * Seed D1 database from local .data/ JSON files
 *
 * Usage:
 *   1. Apply schema:  npx wrangler d1 execute filter-db --file=db/schema.sql
 *   2. Seed data:     node scripts/seed-d1.js
 *                     (runs wrangler d1 execute under the hood)
 *
 * For remote (production) seeding, add --remote flag:
 *   npx wrangler d1 execute filter-db --file=db/schema.sql --remote
 *   node scripts/seed-d1.js --remote
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DATA_DIR = path.join(__dirname, '../.data');
const BATCH_SIZE = 50; // D1 has a 100-statement batch limit, stay well under
const isRemote = process.argv.includes('--remote');

function loadJSON(filename) {
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) {
    console.error(`❌ Missing ${filepath} — run "npm run prefetch:prod" first`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

/** Escape single quotes for SQL */
function esc(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

function boolInt(val) {
  if (val === null || val === undefined) return 'NULL';
  return val ? '1' : '0';
}

function getCoords(shop) {
  if (shop.coordinates?.lat && shop.coordinates?.lng) {
    return { lat: shop.coordinates.lat, lng: shop.coordinates.lng };
  }
  if (shop.latitude && shop.longitude) {
    return { lat: shop.latitude, lng: shop.longitude };
  }
  return { lat: null, lng: null };
}

function getCountryCode(shop) {
  // Try direct country
  if (shop.country?.code) return shop.country.code;
  // Try via location
  if (shop.location?.country?.code) return shop.location.country.code;
  // Try via city_area.location
  const ca = shop.city_area || shop.cityArea;
  if (ca?.location?.country?.code) return ca.location.country.code;
  return null;
}

function buildBrandInsert(brand) {
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
    'has_siphon', 'oat_milk', 'plant_milk',
    'equipment', 'awards', 'research', 'cited_sources', 'observations',
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
    boolInt(brand.has_siphon), boolInt(brand.oatMilk), boolInt(brand.plantMilk),
    brand.equipment ? esc(brand.equipment) : 'NULL',
    brand.awards ? esc(brand.awards) : 'NULL',
    brand.research ? esc(brand.research) : 'NULL',
    brand.citedSources ? esc(brand.citedSources) : 'NULL',
    brand.observations ? esc(brand.observations) : 'NULL',
    boolInt(brand.isDev), esc(brand.createdAt), esc(brand.updatedAt), esc(brand.publishedAt),
  ];

  return `INSERT OR REPLACE INTO brands (${cols.join(',')}) VALUES (${vals.join(',')});`;
}

function buildShopInsert(shop, brandMap) {
  const coords = getCoords(shop);
  const countryCode = getCountryCode(shop);
  const brand = shop.brand;
  const ca = shop.city_area || shop.cityArea;
  const cp = shop.coffee_partner;

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
    shop.google_rating !== null && shop.google_rating !== undefined ? shop.google_rating : 'NULL',
    shop.google_review_count !== null && shop.google_review_count !== undefined ? shop.google_review_count : 'NULL',
    shop.rating !== null && shop.rating !== undefined ? shop.rating : 'NULL',
    shop.rating_count !== null && shop.rating_count !== undefined ? shop.rating_count : 'NULL',
    esc(shop.google_place_id), boolInt(shop.google_place_verified), esc(shop.google_place_last_sync),
    shop.google_place_match_confidence !== null && shop.google_place_match_confidence !== undefined ? shop.google_place_match_confidence : 'NULL',
    esc(shop.google_business_status), esc(shop.google_photo_reference), esc(shop.google_formatted_address),
    esc(shop.google_plus_code),
    shop.google_types ? esc(shop.google_types) : 'NULL',
    esc(shop.google_places_last_updated), esc(shop.google_coordinates_last_updated),
    esc(shop.website), esc(shop.phone), esc(shop.phone_number),
    esc(shop.instagram), esc(shop.facebook), esc(shop.tiktok),
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

function buildBeanInsert(bean) {
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
    bean.cuppingScore !== null && bean.cuppingScore !== undefined ? bean.cuppingScore : 'NULL',
    esc(bean.blendComponents),
    esc(bean.photo?.url), bean.photo?.formats ? esc(bean.photo.formats) : 'NULL',
    esc(bean.brandDocumentId),
    bean.citedSources ? esc(bean.citedSources) : 'NULL',
    esc(bean.createdAt), esc(bean.updatedAt), esc(bean.publishedAt),
  ];

  return `INSERT OR REPLACE INTO beans (${cols.join(',')}) VALUES (${vals.join(',')});`;
}

function executeSqlBatch(statements, label) {
  if (statements.length === 0) return;

  // Write SQL to a temp file and execute via wrangler
  const tmpFile = path.join(__dirname, `../.data/_seed_${label}.sql`);
  fs.writeFileSync(tmpFile, statements.join('\n'));

  const remoteFlag = isRemote ? ' --remote' : '';
  try {
    execSync(`npx wrangler@latest d1 execute filter-db --file="${tmpFile}"${remoteFlag}`, {
      stdio: 'pipe',
      cwd: path.join(__dirname, '..'),
      timeout: 120000,
    });
  } finally {
    // Clean up temp file
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

async function main() {
  console.log(`🌱 Seeding D1 database${isRemote ? ' (REMOTE)' : ' (LOCAL)'}...\n`);

  // Load data
  const brands = loadJSON('brands.json');
  const shops = loadJSON('shops.json');

  console.log(`📦 Loaded ${shops.length} shops, ${brands.length} brands\n`);

  // 1. Seed brands
  console.log('1. Seeding brands...');
  const brandStatements = brands.map(buildBrandInsert);
  for (let i = 0; i < brandStatements.length; i += BATCH_SIZE) {
    const batch = brandStatements.slice(i, i + BATCH_SIZE);
    executeSqlBatch(batch, `brands_${i}`);
    process.stdout.write(`   ${Math.min(i + BATCH_SIZE, brandStatements.length)}/${brandStatements.length}\r`);
  }
  console.log(`   ✓ ${brands.length} brands\n`);

  // 2. Seed brand suppliers
  console.log('2. Seeding brand suppliers...');
  const supplierStatements = [];
  for (const brand of brands) {
    if (brand.suppliers && brand.suppliers.length > 0) {
      for (const supplier of brand.suppliers) {
        supplierStatements.push(
          `INSERT OR REPLACE INTO brand_suppliers (brand_document_id, supplier_document_id) VALUES (${esc(brand.documentId)}, ${esc(supplier.documentId)});`
        );
      }
    }
  }
  for (let i = 0; i < supplierStatements.length; i += BATCH_SIZE) {
    executeSqlBatch(supplierStatements.slice(i, i + BATCH_SIZE), `suppliers_${i}`);
  }
  console.log(`   ✓ ${supplierStatements.length} supplier relations\n`);

  // 3. Seed brand roast countries
  console.log('3. Seeding brand roast countries...');
  const roastCountryStatements = [];
  for (const brand of brands) {
    if (brand.ownRoastCountry && brand.ownRoastCountry.length > 0) {
      for (const country of brand.ownRoastCountry) {
        if (country.code) {
          roastCountryStatements.push(
            `INSERT OR REPLACE INTO brand_roast_countries (brand_document_id, country_name, country_code) VALUES (${esc(brand.documentId)}, ${esc(country.name)}, ${esc(country.code)});`
          );
        }
      }
    }
  }
  for (let i = 0; i < roastCountryStatements.length; i += BATCH_SIZE) {
    executeSqlBatch(roastCountryStatements.slice(i, i + BATCH_SIZE), `roast_countries_${i}`);
  }
  console.log(`   ✓ ${roastCountryStatements.length} roast country relations\n`);

  // 4. Seed shops
  console.log('4. Seeding shops...');
  const brandMap = new Map(brands.map(b => [b.documentId, b]));
  const shopStatements = shops.map(s => buildShopInsert(s, brandMap));
  for (let i = 0; i < shopStatements.length; i += BATCH_SIZE) {
    const batch = shopStatements.slice(i, i + BATCH_SIZE);
    executeSqlBatch(batch, `shops_${i}`);
    process.stdout.write(`   ${Math.min(i + BATCH_SIZE, shopStatements.length)}/${shopStatements.length}\r`);
  }
  console.log(`   ✓ ${shops.length} shops\n`);

  // 5. Seed beans
  console.log('5. Seeding beans...');
  const beanStatements = [];
  const beanOriginStatements = [];
  const beanTagStatements = [];

  for (const brand of brands) {
    if (!brand.beans) continue;
    for (const bean of brand.beans) {
      // Add brand reference
      bean.brandDocumentId = brand.documentId;
      beanStatements.push(buildBeanInsert(bean));

      // Origins
      if (bean.origins) {
        for (const origin of bean.origins) {
          if (origin.code) {
            beanOriginStatements.push(
              `INSERT OR REPLACE INTO bean_origins (bean_document_id, country_name, country_code) VALUES (${esc(bean.documentId)}, ${esc(origin.name)}, ${esc(origin.code)});`
            );
          }
        }
      }

      // Flavor tags
      if (bean.flavorTags) {
        for (const tag of bean.flavorTags) {
          beanTagStatements.push(
            `INSERT OR REPLACE INTO bean_flavor_tags (bean_document_id, tag_document_id, tag_name) VALUES (${esc(bean.documentId)}, ${esc(tag.documentId)}, ${esc(tag.name)});`
          );
        }
      }
    }
  }

  for (let i = 0; i < beanStatements.length; i += BATCH_SIZE) {
    executeSqlBatch(beanStatements.slice(i, i + BATCH_SIZE), `beans_${i}`);
  }
  console.log(`   ✓ ${beanStatements.length} beans`);

  for (let i = 0; i < beanOriginStatements.length; i += BATCH_SIZE) {
    executeSqlBatch(beanOriginStatements.slice(i, i + BATCH_SIZE), `bean_origins_${i}`);
  }
  console.log(`   ✓ ${beanOriginStatements.length} bean origins`);

  for (let i = 0; i < beanTagStatements.length; i += BATCH_SIZE) {
    executeSqlBatch(beanTagStatements.slice(i, i + BATCH_SIZE), `bean_tags_${i}`);
  }
  console.log(`   ✓ ${beanTagStatements.length} bean flavor tags\n`);

  console.log('✅ D1 database seeded successfully!');
}

main().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
