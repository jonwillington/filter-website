import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/api/d1';
import { SHOP_POPULATE, LOCATION_POPULATE, CITY_AREA_POPULATE } from '@/lib/api/strapiPopulate';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://helpful-oasis-8bb949e05d.strapiapp.com/api';
const STRAPI_TOKEN = process.env.NEXT_PUBLIC_STRAPI_TOKEN;

/**
 * Fetch the full entry from Strapi with proper population.
 * Webhook payloads are minimal — we re-fetch to get all relations.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchFullEntry(model: string, documentId: string): Promise<any> {
  const populateMap: Record<string, string> = {
    shop: SHOP_POPULATE + '&populate[menus]=*&populate[coffee_partner][populate][logo]=*',
    brand: [
      'populate[logo][fields][0]=url',
      'populate[logo][fields][1]=formats',
      'populate[ownRoastCountry][fields][0]=name',
      'populate[ownRoastCountry][fields][1]=code',
      'populate[suppliers][fields][0]=documentId',
    ].join('&'),
    bean: [
      'populate[brand][fields][0]=documentId',
      'populate[photo][fields][0]=url',
      'populate[photo][fields][1]=formats',
      'populate[origins]=*',
      'populate[flavorTags]=*',
    ].join('&'),
    location: LOCATION_POPULATE + '&populate[storyAuthor][populate][photo]=*',
    country: 'populate[region]=*',
    'city-area': CITY_AREA_POPULATE + '&populate[featured_image]=*',
  };

  // Map model names to Strapi plural endpoints
  const endpointMap: Record<string, string> = {
    shop: 'shops',
    brand: 'brands',
    bean: 'beans',
    location: 'locations',
    country: 'countries',
    'city-area': 'city-areas',
  };

  const endpoint = endpointMap[model];
  const populate = populateMap[model] || 'populate=*';
  if (!endpoint) return null;

  const url = `${STRAPI_URL}/${endpoint}/${documentId}?${populate}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${STRAPI_TOKEN}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    console.error(`Failed to fetch ${model}/${documentId} from Strapi: ${res.status}`);
    return null;
  }

  const json = await res.json();
  return json.data || json;
}

/**
 * POST /api/v2/webhook — Strapi webhook handler
 *
 * Receives create/update/delete events from Strapi, then re-fetches
 * the full entry from Strapi (with populated relations) before syncing to D1.
 */
export async function POST(request: NextRequest) {
  // Verify webhook secret
  const secret = request.headers.get('x-webhook-secret');
  const expectedSecret = process.env.WEBHOOK_SECRET;

  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = await request.json();
    const { event, model, entry } = body;

    // Strapi test trigger sends {"event":"trigger-test"} with no model/entry
    if (event === 'trigger-test') {
      return NextResponse.json({ success: true, event: 'trigger-test' });
    }

    if (!event || !model || !entry) {
      return NextResponse.json({ error: 'Invalid webhook payload', received: body }, { status: 400 });
    }

    const db = await getDB();
    if (!db) {
      return NextResponse.json({ error: 'D1 database unavailable' }, { status: 503 });
    }
    const isDelete = event === 'entry.delete';
    const documentId = entry.documentId;

    if (!documentId) {
      return NextResponse.json({ error: 'Missing documentId' }, { status: 400 });
    }

    // For create/update events, re-fetch the full entry from Strapi with populated relations
    // Webhook payloads are minimal and missing relation data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let fullEntry: any = entry;
    let useFallback = false;
    if (!isDelete) {
      const fetched = await fetchFullEntry(model, documentId);
      if (fetched) {
        fullEntry = fetched;
      } else {
        useFallback = true;
        console.warn(`[webhook] Strapi re-fetch failed for ${model}/${documentId}. Using partial update fallback.`);
      }
    }

    switch (model) {
      case 'shop': {
        if (isDelete) {
          await db.prepare('DELETE FROM shops WHERE document_id = ?1').bind(documentId).run();
        } else if (useFallback) {
          await partialUpdateShop(db, fullEntry);
        } else {
          await upsertShop(db, fullEntry);
        }
        break;
      }
      case 'brand': {
        if (isDelete) {
          await db.prepare('DELETE FROM brands WHERE document_id = ?1').bind(documentId).run();
          await db.prepare('DELETE FROM brand_suppliers WHERE brand_document_id = ?1').bind(documentId).run();
          await db.prepare('DELETE FROM brand_roast_countries WHERE brand_document_id = ?1').bind(documentId).run();
          await db.prepare(`
            UPDATE shops SET brand_name = NULL, brand_type = NULL,
                             brand_logo_url = NULL, brand_statement = NULL
            WHERE brand_document_id = ?1
          `).bind(documentId).run();
        } else if (useFallback) {
          await partialUpdateBrand(db, fullEntry);
          // Cascade scalar-only fields to shops (skip logo since it's a relation)
          await db.prepare(`
            UPDATE shops SET brand_name = ?1, brand_type = ?2, brand_statement = ?3
            WHERE brand_document_id = ?4
          `).bind(
            fullEntry.name,
            fullEntry.type || null,
            fullEntry.statement || null,
            documentId
          ).run();
        } else {
          await upsertBrand(db, fullEntry);
          await db.prepare(`
            UPDATE shops SET brand_name = ?1, brand_type = ?2,
                             brand_logo_url = ?3, brand_statement = ?4
            WHERE brand_document_id = ?5
          `).bind(
            fullEntry.name,
            fullEntry.type || null,
            fullEntry.logo?.url || null,
            fullEntry.statement || null,
            documentId
          ).run();
        }
        break;
      }
      case 'bean': {
        if (isDelete) {
          await db.prepare('DELETE FROM beans WHERE document_id = ?1').bind(documentId).run();
          await db.prepare('DELETE FROM bean_origins WHERE bean_document_id = ?1').bind(documentId).run();
          await db.prepare('DELETE FROM bean_flavor_tags WHERE bean_document_id = ?1').bind(documentId).run();
        } else if (useFallback) {
          await partialUpdateBean(db, fullEntry);
          // Skip junction tables (origins, flavor tags) — they need populated relations
        } else {
          await upsertBean(db, fullEntry);
        }
        break;
      }
      case 'location': {
        if (isDelete) {
          await db.prepare('DELETE FROM locations WHERE document_id = ?1').bind(documentId).run();
          await db.prepare(`
            UPDATE shops SET location_name = NULL, location_slug = NULL
            WHERE location_document_id = ?1
          `).bind(documentId).run();
          await db.prepare(`
            UPDATE city_areas SET location_name = NULL, location_slug = NULL
            WHERE location_document_id = ?1
          `).bind(documentId).run();
        } else if (useFallback) {
          await partialUpdateLocation(db, fullEntry);
          // Cascade scalar fields to shops and city_areas
          await db.prepare(`
            UPDATE shops SET location_name = ?1, location_slug = ?2
            WHERE location_document_id = ?3
          `).bind(fullEntry.name, fullEntry.slug || null, documentId).run();
          await db.prepare(`
            UPDATE city_areas SET location_name = ?1, location_slug = ?2
            WHERE location_document_id = ?3
          `).bind(fullEntry.name, fullEntry.slug || null, documentId).run();
        } else {
          await upsertLocation(db, fullEntry);
          await db.prepare(`
            UPDATE shops SET location_name = ?1, location_slug = ?2
            WHERE location_document_id = ?3
          `).bind(fullEntry.name, fullEntry.slug || null, documentId).run();
          await db.prepare(`
            UPDATE city_areas SET location_name = ?1, location_slug = ?2
            WHERE location_document_id = ?3
          `).bind(fullEntry.name, fullEntry.slug || null, documentId).run();
        }
        break;
      }
      case 'country': {
        if (isDelete) {
          await db.prepare('DELETE FROM countries WHERE document_id = ?1').bind(documentId).run();
          await db.prepare(`
            UPDATE locations SET country_name = NULL, country_code = NULL,
                                 country_primary_color = NULL, country_secondary_color = NULL
            WHERE country_document_id = ?1
          `).bind(documentId).run();
        } else if (useFallback) {
          await partialUpdateCountry(db, fullEntry);
          // Cascade scalar fields to locations
          await db.prepare(`
            UPDATE locations SET country_name = ?1, country_code = ?2,
                                 country_primary_color = ?3, country_secondary_color = ?4
            WHERE country_document_id = ?5
          `).bind(
            fullEntry.name,
            fullEntry.code || null,
            fullEntry.primaryColor || null,
            fullEntry.secondaryColor || null,
            documentId
          ).run();
        } else {
          await upsertCountry(db, fullEntry);
          await db.prepare(`
            UPDATE locations SET country_name = ?1, country_code = ?2,
                                 country_primary_color = ?3, country_secondary_color = ?4
            WHERE country_document_id = ?5
          `).bind(
            fullEntry.name,
            fullEntry.code || null,
            fullEntry.primaryColor || null,
            fullEntry.secondaryColor || null,
            documentId
          ).run();
        }
        break;
      }
      case 'city-area': {
        if (isDelete) {
          await db.prepare('DELETE FROM city_areas WHERE document_id = ?1').bind(documentId).run();
          await db.prepare(`
            UPDATE shops SET city_area_name = NULL, city_area_group = NULL
            WHERE city_area_document_id = ?1
          `).bind(documentId).run();
        } else if (useFallback) {
          await partialUpdateCityArea(db, fullEntry);
          // Cascade scalar fields to shops
          await db.prepare(`
            UPDATE shops SET city_area_name = ?1, city_area_group = ?2
            WHERE city_area_document_id = ?3
          `).bind(
            fullEntry.name,
            fullEntry.group || null,
            documentId
          ).run();
        } else {
          await upsertCityArea(db, fullEntry);
          await db.prepare(`
            UPDATE shops SET city_area_name = ?1, city_area_group = ?2
            WHERE city_area_document_id = ?3
          `).bind(
            fullEntry.name,
            fullEntry.group || null,
            documentId
          ).run();
        }
        break;
      }
      default:
        return NextResponse.json({ message: `Unhandled model: ${model}` }, { status: 200 });
    }

    return NextResponse.json({
      success: true, event, model, documentId,
      ...(useFallback && { fallback: true, warning: 'Strapi unavailable — scalar fields updated, relation data preserved' }),
    });
  } catch (error) {
    console.error('Webhook processing failed:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function upsertShop(db: D1Database, entry: any) {
  const coords = getCoords(entry);
  const ca = entry.city_area || entry.cityArea;
  const cp = entry.coffee_partner;
  const countryCode = entry.country?.code
    || entry.location?.country?.code
    || ca?.location?.country?.code
    || null;

  await db.prepare(`
    INSERT OR REPLACE INTO shops (
      document_id, id, name, pref_name, slug, description,
      address, postal_code, neighbourhood, lat, lng,
      brand_document_id, location_document_id, city_area_document_id, country_code,
      brand_name, brand_type, brand_logo_url, brand_statement,
      location_name, location_slug, city_area_name, city_area_group,
      featured_image_url, featured_image_formats,
      gallery, menus,
      has_wifi, has_food, has_outdoor_space, is_pet_friendly,
      has_v60, has_chemex, has_filter_coffee, has_slow_bar, has_kitchen,
      has_espresso, has_aeropress, has_french_press, has_cold_brew, has_batch_brew,
      is_chain, independent,
      city_area_rec, city_area_rec_exp, working_rec, interior_rec, brewing_rec,
      shop_promo, shop_promo_code,
      google_rating, google_review_count, rating, rating_count,
      google_place_id, google_place_verified, google_place_last_sync, google_place_match_confidence,
      google_business_status, google_photo_reference, google_formatted_address, google_plus_code,
      google_types, google_places_last_updated, google_coordinates_last_updated,
      website, phone, phone_number, instagram, facebook, tiktok,
      amenity_overrides, brew_method_overrides, menu_data,
      public_tags, amenities,
      architects, price, quality_tier, opening_hours, is_open,
      local_density,
      research, cited_sources, observations, vision_data, preference_profile,
      coffee_partner_document_id, coffee_partner_name, coffee_partner_logo_url,
      is_dev, awards, source_articles,
      created_at, updated_at, published_at
    ) VALUES (
      ?1,  ?2,  ?3,  ?4,  ?5,  ?6,
      ?7,  ?8,  ?9,  ?10, ?11,
      ?12, ?13, ?14, ?15,
      ?16, ?17, ?18, ?19,
      ?20, ?21, ?22, ?23,
      ?24, ?25,
      ?26, ?27,
      ?28, ?29, ?30, ?31,
      ?32, ?33, ?34, ?35, ?36,
      ?37, ?38, ?39, ?40, ?41,
      ?42, ?43,
      ?44, ?45, ?46, ?47, ?48,
      ?49, ?50,
      ?51, ?52, ?53, ?54,
      ?55, ?56, ?57, ?58,
      ?59, ?60, ?61, ?62,
      ?63, ?64, ?65,
      ?66, ?67, ?68, ?69, ?70, ?71,
      ?72, ?73, ?74,
      ?75, ?76,
      ?77, ?78, ?79, ?80, ?81,
      ?82,
      ?83, ?84, ?85, ?86, ?87,
      ?88, ?89, ?90,
      ?91, ?92, ?93,
      ?94, ?95, ?96
    )
  `).bind(
    entry.documentId,                                    // 1
    entry.id || null,                                    // 2
    entry.name,                                          // 3
    entry.prefName || null,                              // 4
    entry.slug || null,                                  // 5
    entry.description || null,                           // 6
    entry.address || null,                               // 7
    entry.postal_code || null,                           // 8
    entry.neighbourhood || null,                         // 9
    coords.lat,                                          // 10
    coords.lng,                                          // 11
    entry.brand?.documentId || null,                     // 12
    entry.location?.documentId || null,                  // 13
    ca?.documentId || null,                              // 14
    countryCode,                                         // 15
    entry.brand?.name || null,                           // 16
    entry.brand?.type || null,                           // 17
    entry.brand?.logo?.url || null,                      // 18
    entry.brand?.statement || null,                      // 19
    entry.location?.name || null,                        // 20
    entry.location?.slug || null,                        // 21
    ca?.name || null,                                    // 22
    ca?.group || null,                                   // 23
    entry.featured_image?.url || null,                   // 24
    toJson(entry.featured_image?.formats),               // 25
    toJson(entry.gallery),                               // 26
    toJson(entry.menus),                                 // 27
    toBoolInt(entry.has_wifi),                           // 28
    toBoolInt(entry.has_food),                           // 29
    toBoolInt(entry.has_outdoor_space),                  // 30
    toBoolInt(entry.is_pet_friendly),                    // 31
    toBoolInt(entry.has_v60),                            // 32
    toBoolInt(entry.has_chemex),                         // 33
    toBoolInt(entry.has_filter_coffee),                  // 34
    toBoolInt(entry.has_slow_bar),                       // 35
    toBoolInt(entry.has_kitchen),                        // 36
    toBoolInt(entry.has_espresso),                       // 37
    toBoolInt(entry.has_aeropress),                      // 38
    toBoolInt(entry.has_french_press),                   // 39
    toBoolInt(entry.has_cold_brew),                      // 40
    toBoolInt(entry.has_batch_brew),                     // 41
    toBoolInt(entry.is_chain),                           // 42
    toBoolInt(entry.independent),                        // 43
    toBoolInt(entry.cityAreaRec),                        // 44
    entry.cityAreaRecExp || null,                        // 45
    toBoolInt(entry.workingRec),                         // 46
    toBoolInt(entry.interiorRec),                        // 47
    toBoolInt(entry.brewingRec),                         // 48
    entry.shopPromo || null,                             // 49
    entry.shopPromoCode || null,                         // 50
    entry.google_rating ?? null,                         // 51
    entry.google_review_count ?? null,                   // 52
    entry.rating ?? null,                                // 53
    entry.rating_count ?? null,                          // 54
    entry.google_place_id || null,                       // 55
    toBoolInt(entry.google_place_verified),              // 56
    entry.google_place_last_sync || null,                // 57
    entry.google_place_match_confidence ?? null,         // 58
    entry.google_business_status || null,                // 59
    entry.google_photo_reference || null,                // 60
    entry.google_formatted_address || null,              // 61
    entry.google_plus_code || null,                      // 62
    toJson(entry.google_types),                          // 63
    entry.google_places_last_updated || null,            // 64
    entry.google_coordinates_last_updated || null,       // 65
    entry.website || null,                               // 66
    entry.phone || null,                                 // 67
    entry.phone_number || null,                          // 68
    entry.instagram || null,                             // 69
    entry.facebook || null,                              // 70
    entry.tiktok || null,                                // 71
    toJson(entry.amenity_overrides),                     // 72
    toJson(entry.brew_method_overrides),                  // 73
    toJson(entry.menuData),                              // 74
    toJson(entry.public_tags),                           // 75
    toJson(entry.amenities),                             // 76
    entry.architects || null,                            // 77
    entry.price || null,                                 // 78
    entry.quality_tier || null,                          // 79
    toJson(entry.opening_hours),                         // 80
    toBoolInt(entry.is_open),                            // 81
    entry.localDensity ?? 0,                             // 82
    toJson(entry.research),                              // 83
    toJson(entry.citedSources),                          // 84
    toJson(entry.observations),                          // 85
    toJson(entry.visionData),                            // 86
    toJson(entry.preferenceProfile),                     // 87
    cp?.documentId || null,                              // 88
    cp?.name || null,                                    // 89
    cp?.logo?.url || null,                               // 90
    toBoolInt(entry.isDev),                              // 91
    toJson(entry.awards),                                // 92
    toJson(entry.source_articles),                       // 93
    entry.createdAt || null,                             // 94
    entry.updatedAt || null,                             // 95
    entry.publishedAt || null,                           // 96
  ).run();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function upsertBrand(db: D1Database, entry: any) {
  await db.prepare(`
    INSERT OR REPLACE INTO brands (
      document_id, id, name, type, role, description, story, statement,
      founded, founder, hq, price, quality_tier,
      logo_url, logo_formats, bg_image_url, bg_image_formats,
      website, instagram, facebook, tiktok, twitter, youtube, phone, whatsapp, line,
      roast_own_beans, own_roast_desc, own_bean_link,
      specializes_light, specializes_medium, specializes_dark,
      has_wifi, has_food, has_outdoor_space, is_pet_friendly,
      has_espresso, has_filter_coffee, has_v60, has_chemex,
      has_aeropress, has_french_press, has_cold_brew, has_batch_brew,
      has_siphon, has_turkish_coffee, oat_milk, plant_milk,
      equipment, awards, research, cited_sources, observations, source_articles,
      is_dev, created_at, updated_at, published_at
    ) VALUES (
      ?1,  ?2,  ?3,  ?4,  ?5,  ?6,  ?7,  ?8,
      ?9,  ?10, ?11, ?12, ?13,
      ?14, ?15, ?16, ?17,
      ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26,
      ?27, ?28, ?29,
      ?30, ?31, ?32,
      ?33, ?34, ?35, ?36,
      ?37, ?38, ?39, ?40,
      ?41, ?42, ?43, ?44,
      ?45, ?46, ?47, ?48,
      ?49, ?50, ?51, ?52, ?53, ?54,
      ?55, ?56, ?57, ?58
    )
  `).bind(
    entry.documentId,                                    // 1
    entry.id || null,                                    // 2
    entry.name,                                          // 3
    entry.type || null,                                  // 4
    entry.role || null,                                  // 5
    entry.description || null,                           // 6
    entry.story || null,                                 // 7
    entry.statement || null,                             // 8
    entry.founded || null,                               // 9
    entry.Founder || entry.founder || null,               // 10
    entry.hq || null,                                    // 11
    entry.price || null,                                 // 12
    entry.quality_tier || null,                           // 13
    entry.logo?.url || null,                             // 14
    toJson(entry.logo?.formats),                         // 15
    entry['bg-image']?.url || null,                      // 16
    toJson(entry['bg-image']?.formats),                  // 17
    entry.website || null,                               // 18
    entry.instagram || null,                             // 19
    entry.facebook || null,                              // 20
    entry.tiktok || null,                                // 21
    entry.twitter || null,                               // 22
    entry.youtube || null,                               // 23
    entry.phone || null,                                 // 24
    entry.whatsapp || null,                              // 25
    entry.line || null,                                  // 26
    toBoolInt(entry.roastOwnBeans),                      // 27
    entry.ownRoastDesc || null,                          // 28
    entry.ownBeanLink || null,                           // 29
    toBoolInt(entry.specializes_light),                  // 30
    toBoolInt(entry.specializes_medium),                 // 31
    toBoolInt(entry.specializes_dark),                   // 32
    toBoolInt(entry.has_wifi),                           // 33
    toBoolInt(entry.has_food),                           // 34
    toBoolInt(entry.has_outdoor_space),                  // 35
    toBoolInt(entry.is_pet_friendly),                    // 36
    toBoolInt(entry.has_espresso),                       // 37
    toBoolInt(entry.has_filter_coffee),                  // 38
    toBoolInt(entry.has_v60),                            // 39
    toBoolInt(entry.has_chemex),                         // 40
    toBoolInt(entry.has_aeropress),                      // 41
    toBoolInt(entry.has_french_press),                   // 42
    toBoolInt(entry.has_cold_brew),                      // 43
    toBoolInt(entry.has_batch_brew),                     // 44
    toBoolInt(entry.has_siphon),                         // 45
    toBoolInt(entry.has_turkish_coffee),                 // 46
    toBoolInt(entry.oatMilk),                            // 47
    toBoolInt(entry.plantMilk),                          // 48
    toJson(entry.equipment),                             // 49
    toJson(entry.awards),                                // 50
    toJson(entry.research),                              // 51
    toJson(entry.citedSources),                          // 52
    toJson(entry.observations),                          // 53
    toJson(entry.source_articles),                       // 54
    toBoolInt(entry.isDev),                              // 55
    entry.createdAt || null,                             // 56
    entry.updatedAt || null,                             // 57
    entry.publishedAt || null,                           // 58
  ).run();

  // Re-sync brand suppliers
  await db.prepare('DELETE FROM brand_suppliers WHERE brand_document_id = ?1')
    .bind(entry.documentId as string).run();
  const suppliers = entry.suppliers;
  if (suppliers) {
    for (const supplier of suppliers) {
      if (supplier.documentId) {
        await db.prepare(
          'INSERT INTO brand_suppliers (brand_document_id, supplier_document_id) VALUES (?1, ?2)'
        ).bind(entry.documentId as string, supplier.documentId).run();
      }
    }
  }

  // Re-sync brand roast countries
  await db.prepare('DELETE FROM brand_roast_countries WHERE brand_document_id = ?1')
    .bind(entry.documentId as string).run();
  const roastCountries = entry.ownRoastCountry;
  if (roastCountries) {
    for (const country of roastCountries) {
      if (country.code) {
        await db.prepare(
          'INSERT INTO brand_roast_countries (brand_document_id, country_name, country_code) VALUES (?1, ?2, ?3)'
        ).bind(entry.documentId as string, country.name || null, country.code).run();
      }
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function upsertBean(db: D1Database, entry: any) {
  const brandDocId = entry.brand?.documentId || null;

  await db.prepare(`
    INSERT OR REPLACE INTO beans (
      document_id, id, name, slug, type, roast_level, process,
      short_description, full_description, learn_more_url,
      region, farm, producer, altitude, cupping_score, blend_components,
      photo_url, photo_formats, brand_document_id,
      created_at, updated_at, published_at
    ) VALUES (
      ?1, ?2, ?3, ?4, ?5, ?6, ?7,
      ?8, ?9, ?10,
      ?11, ?12, ?13, ?14, ?15, ?16,
      ?17, ?18, ?19,
      ?20, ?21, ?22
    )
  `).bind(
    entry.documentId,
    entry.id || null,
    entry.name,
    entry.slug || null,
    entry.type || null,
    entry.roastLevel || null,
    entry.process || null,
    entry.shortDescription || null,
    entry.fullDescription || null,
    entry.learnMoreUrl || null,
    entry.region || null,
    entry.farm || null,
    entry.producer || null,
    entry.altitude || null,
    entry.cuppingScore || null,
    entry.blendComponents || null,
    entry.photo?.url || null,
    entry.photo?.formats
      ? JSON.stringify(entry.photo.formats)
      : null,
    brandDocId,
    entry.createdAt || null,
    entry.updatedAt || null,
    entry.publishedAt || null,
  ).run();

  // Re-sync origins
  await db.prepare('DELETE FROM bean_origins WHERE bean_document_id = ?1')
    .bind(entry.documentId as string).run();
  const origins = entry.origins;
  if (origins) {
    for (const origin of origins) {
      if (origin.code) {
        await db.prepare(
          'INSERT INTO bean_origins (bean_document_id, country_name, country_code) VALUES (?1, ?2, ?3)'
        ).bind(entry.documentId as string, origin.name || null, origin.code).run();
      }
    }
  }

  // Re-sync flavor tags
  await db.prepare('DELETE FROM bean_flavor_tags WHERE bean_document_id = ?1')
    .bind(entry.documentId as string).run();
  const tags = entry.flavorTags;
  if (tags) {
    for (const tag of tags) {
      await db.prepare(
        'INSERT INTO bean_flavor_tags (bean_document_id, tag_document_id, tag_name) VALUES (?1, ?2, ?3)'
      ).bind(entry.documentId as string, tag.documentId || null, tag.name).run();
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function upsertLocation(db: D1Database, entry: any) {
  const country = entry.country;
  const storyAuthor = entry.storyAuthor;
  const bgImage = entry.background_image;

  await db.prepare(`
    INSERT OR REPLACE INTO locations (
      document_id, id, name, slug, story, headline,
      rating_stars, population, timezone,
      in_focus, beta, coming_soon,
      primary_color, secondary_color,
      coordinates, boundary_coordinates,
      bg_image_url, bg_image_formats, media_links,
      story_author_id, story_author_document_id, story_author_name, story_author_photo_url,
      country_document_id, country_name, country_code,
      country_primary_color, country_secondary_color,
      created_at, updated_at, published_at
    ) VALUES (
      ?1,  ?2,  ?3,  ?4,  ?5,  ?6,
      ?7,  ?8,  ?9,
      ?10, ?11, ?12,
      ?13, ?14,
      ?15, ?16,
      ?17, ?18, ?19,
      ?20, ?21, ?22, ?23,
      ?24, ?25, ?26,
      ?27, ?28,
      ?29, ?30, ?31
    )
  `).bind(
    entry.documentId,
    entry.id || null,
    entry.name,
    entry.slug || null,
    entry.story || null,
    entry.headline || null,
    entry.rating_stars ?? null,
    entry.population || null,
    entry.timezone || null,
    toBoolInt(entry.inFocus),
    toBoolInt(entry.beta),
    toBoolInt(entry.comingSoon),
    entry.primaryColor || null,
    entry.secondaryColor || null,
    toJson(entry.coordinates),
    toJson(entry.boundary_coordinates),
    bgImage?.url || null,
    toJson(bgImage?.formats),
    toJson(entry.media_links),
    storyAuthor?.id || null,
    storyAuthor?.documentId || null,
    storyAuthor?.name || null,
    storyAuthor?.photo?.url || null,
    country?.documentId || null,
    country?.name || null,
    country?.code || null,
    country?.primaryColor || null,
    country?.secondaryColor || null,
    entry.createdAt || null,
    entry.updatedAt || null,
    entry.publishedAt || null,
  ).run();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function upsertCountry(db: D1Database, entry: any) {
  const region = entry.region;

  await db.prepare(`
    INSERT OR REPLACE INTO countries (
      document_id, id, name, code, slug, story,
      supported, coming_soon,
      primary_color, primary_color_dark, secondary_color, secondary_color_dark,
      accent_colour, high_inflation, producer,
      region_document_id, region_name, region_coming_soon,
      created_at, updated_at, published_at
    ) VALUES (
      ?1,  ?2,  ?3,  ?4,  ?5,  ?6,
      ?7,  ?8,
      ?9,  ?10, ?11, ?12,
      ?13, ?14, ?15,
      ?16, ?17, ?18,
      ?19, ?20, ?21
    )
  `).bind(
    entry.documentId,
    entry.id || null,
    entry.name,
    entry.code || null,
    entry.slug || null,
    entry.story || null,
    toBoolInt(entry.supported),
    toBoolInt(entry.comingSoon),
    entry.primaryColor || null,
    entry.primaryColorDark || null,
    entry.secondaryColor || null,
    entry.secondaryColorDark || null,
    entry.accentColour || null,
    toBoolInt(entry.highInflation),
    toBoolInt(entry.producer),
    region?.documentId || null,
    region?.Name || region?.name || null,
    toBoolInt(region?.comingSoon),
    entry.createdAt || null,
    entry.updatedAt || null,
    entry.publishedAt || null,
  ).run();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function upsertCityArea(db: D1Database, entry: any) {
  const loc = entry.location;

  await db.prepare(`
    INSERT OR REPLACE INTO city_areas (
      document_id, id, name, slug, area_group, description, summary,
      featured_image_url, featured_image_formats,
      boundary_coordinates,
      center_coordinates, postcode, nearest_tube, coming_soon,
      location_document_id, location_name, location_slug,
      location_country_name, location_country_code,
      created_at, updated_at, published_at
    ) VALUES (
      ?1,  ?2,  ?3,  ?4,  ?5,  ?6,  ?7,
      ?8,  ?9,
      ?10,
      ?11, ?12, ?13, ?14,
      ?15, ?16, ?17,
      ?18, ?19,
      ?20, ?21, ?22
    )
  `).bind(
    entry.documentId,
    entry.id || null,
    entry.name,
    entry.slug || null,
    entry.group || null,
    entry.description || null,
    entry.summary || null,
    entry.featuredImage?.url || entry.featured_image?.url || null,
    toJson(entry.featuredImage?.formats || entry.featured_image?.formats),
    toJson(entry.boundary_coordinates),
    toJson(entry.center_coordinates),
    entry.postcode || null,
    entry.nearest_tube || null,
    toBoolInt(entry.comingSoon),
    loc?.documentId || null,
    loc?.name || null,
    loc?.slug || null,
    loc?.country?.name || null,
    loc?.country?.code || null,
    entry.createdAt || null,
    entry.updatedAt || null,
    entry.publishedAt || null,
  ).run();
}

// ─── Partial Update Functions (fallback when Strapi re-fetch fails) ───
// These only UPDATE scalar columns, preserving relation data already in D1.
// They skip media/relation fields (logo, bg_image, country, location, brand, etc.)
// and junction tables (suppliers, roast countries, origins, flavor tags).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function partialUpdateCountry(db: D1Database, entry: any) {
  await db.prepare(`
    UPDATE countries SET
      name = ?1, code = ?2, slug = ?3, story = ?4,
      supported = ?5, coming_soon = ?6,
      primary_color = ?7, primary_color_dark = ?8,
      secondary_color = ?9, secondary_color_dark = ?10,
      accent_colour = ?11, high_inflation = ?12, producer = ?13,
      updated_at = ?14, published_at = ?15
    WHERE document_id = ?16
  `).bind(
    entry.name,
    entry.code || null,
    entry.slug || null,
    entry.story || null,
    toBoolInt(entry.supported),
    toBoolInt(entry.comingSoon),
    entry.primaryColor || null,
    entry.primaryColorDark || null,
    entry.secondaryColor || null,
    entry.secondaryColorDark || null,
    entry.accentColour || null,
    toBoolInt(entry.highInflation),
    toBoolInt(entry.producer),
    entry.updatedAt || null,
    entry.publishedAt || null,
    entry.documentId,
  ).run();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function partialUpdateLocation(db: D1Database, entry: any) {
  await db.prepare(`
    UPDATE locations SET
      name = ?1, slug = ?2, story = ?3, headline = ?4,
      rating_stars = ?5, population = ?6, timezone = ?7,
      in_focus = ?8, beta = ?9, coming_soon = ?10,
      primary_color = ?11, secondary_color = ?12,
      coordinates = ?13, boundary_coordinates = ?14,
      media_links = ?15,
      updated_at = ?16, published_at = ?17
    WHERE document_id = ?18
  `).bind(
    entry.name,
    entry.slug || null,
    entry.story || null,
    entry.headline || null,
    entry.rating_stars ?? null,
    entry.population || null,
    entry.timezone || null,
    toBoolInt(entry.inFocus),
    toBoolInt(entry.beta),
    toBoolInt(entry.comingSoon),
    entry.primaryColor || null,
    entry.secondaryColor || null,
    toJson(entry.coordinates),
    toJson(entry.boundary_coordinates),
    toJson(entry.media_links),
    entry.updatedAt || null,
    entry.publishedAt || null,
    entry.documentId,
  ).run();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function partialUpdateBrand(db: D1Database, entry: any) {
  await db.prepare(`
    UPDATE brands SET
      name = ?1, type = ?2, role = ?3, description = ?4, story = ?5, statement = ?6,
      founded = ?7, founder = ?8, hq = ?9, price = ?10, quality_tier = ?11,
      website = ?12, instagram = ?13, facebook = ?14, tiktok = ?15,
      twitter = ?16, youtube = ?17, phone = ?18, whatsapp = ?19, line = ?20,
      roast_own_beans = ?21, own_roast_desc = ?22, own_bean_link = ?23,
      specializes_light = ?24, specializes_medium = ?25, specializes_dark = ?26,
      has_wifi = ?27, has_food = ?28, has_outdoor_space = ?29, is_pet_friendly = ?30,
      has_espresso = ?31, has_filter_coffee = ?32, has_v60 = ?33, has_chemex = ?34,
      has_aeropress = ?35, has_french_press = ?36, has_cold_brew = ?37, has_batch_brew = ?38,
      has_siphon = ?39, has_turkish_coffee = ?40, oat_milk = ?41, plant_milk = ?42,
      equipment = ?43, awards = ?44, research = ?45, cited_sources = ?46,
      observations = ?47, source_articles = ?48,
      is_dev = ?49, updated_at = ?50, published_at = ?51
    WHERE document_id = ?52
  `).bind(
    entry.name,
    entry.type || null,
    entry.role || null,
    entry.description || null,
    entry.story || null,
    entry.statement || null,
    entry.founded || null,
    entry.Founder || entry.founder || null,
    entry.hq || null,
    entry.price || null,
    entry.quality_tier || null,
    entry.website || null,
    entry.instagram || null,
    entry.facebook || null,
    entry.tiktok || null,
    entry.twitter || null,
    entry.youtube || null,
    entry.phone || null,
    entry.whatsapp || null,
    entry.line || null,
    toBoolInt(entry.roastOwnBeans),
    entry.ownRoastDesc || null,
    entry.ownBeanLink || null,
    toBoolInt(entry.specializes_light),
    toBoolInt(entry.specializes_medium),
    toBoolInt(entry.specializes_dark),
    toBoolInt(entry.has_wifi),
    toBoolInt(entry.has_food),
    toBoolInt(entry.has_outdoor_space),
    toBoolInt(entry.is_pet_friendly),
    toBoolInt(entry.has_espresso),
    toBoolInt(entry.has_filter_coffee),
    toBoolInt(entry.has_v60),
    toBoolInt(entry.has_chemex),
    toBoolInt(entry.has_aeropress),
    toBoolInt(entry.has_french_press),
    toBoolInt(entry.has_cold_brew),
    toBoolInt(entry.has_batch_brew),
    toBoolInt(entry.has_siphon),
    toBoolInt(entry.has_turkish_coffee),
    toBoolInt(entry.oatMilk),
    toBoolInt(entry.plantMilk),
    toJson(entry.equipment),
    toJson(entry.awards),
    toJson(entry.research),
    toJson(entry.citedSources),
    toJson(entry.observations),
    toJson(entry.source_articles),
    toBoolInt(entry.isDev),
    entry.updatedAt || null,
    entry.publishedAt || null,
    entry.documentId,
  ).run();
  // Skip junction tables (suppliers, roast countries) — they need populated relations
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function partialUpdateShop(db: D1Database, entry: any) {
  const coords = getCoords(entry);
  await db.prepare(`
    UPDATE shops SET
      name = ?1, pref_name = ?2, slug = ?3, description = ?4,
      address = ?5, postal_code = ?6, neighbourhood = ?7, lat = ?8, lng = ?9,
      has_wifi = ?10, has_food = ?11, has_outdoor_space = ?12, is_pet_friendly = ?13,
      has_v60 = ?14, has_chemex = ?15, has_filter_coffee = ?16, has_slow_bar = ?17, has_kitchen = ?18,
      has_espresso = ?19, has_aeropress = ?20, has_french_press = ?21, has_cold_brew = ?22, has_batch_brew = ?23,
      is_chain = ?24, independent = ?25,
      city_area_rec = ?26, city_area_rec_exp = ?27, working_rec = ?28, interior_rec = ?29, brewing_rec = ?30,
      shop_promo = ?31, shop_promo_code = ?32,
      google_rating = ?33, google_review_count = ?34, rating = ?35, rating_count = ?36,
      google_place_id = ?37, google_place_verified = ?38, google_place_last_sync = ?39,
      google_place_match_confidence = ?40, google_business_status = ?41,
      google_photo_reference = ?42, google_formatted_address = ?43, google_plus_code = ?44,
      google_types = ?45, google_places_last_updated = ?46, google_coordinates_last_updated = ?47,
      website = ?48, phone = ?49, phone_number = ?50, instagram = ?51, facebook = ?52, tiktok = ?53,
      amenity_overrides = ?54, brew_method_overrides = ?55, menu_data = ?56,
      public_tags = ?57, amenities = ?58,
      architects = ?59, price = ?60, quality_tier = ?61, opening_hours = ?62, is_open = ?63,
      local_density = ?64,
      research = ?65, cited_sources = ?66, observations = ?67, vision_data = ?68, preference_profile = ?69,
      is_dev = ?70, awards = ?71, source_articles = ?72,
      gallery = ?73, menus = ?74,
      updated_at = ?75, published_at = ?76
    WHERE document_id = ?77
  `).bind(
    entry.name,                                          // 1
    entry.prefName || null,                              // 2
    entry.slug || null,                                  // 3
    entry.description || null,                           // 4
    entry.address || null,                               // 5
    entry.postal_code || null,                           // 6
    entry.neighbourhood || null,                         // 7
    coords.lat,                                          // 8
    coords.lng,                                          // 9
    toBoolInt(entry.has_wifi),                           // 10
    toBoolInt(entry.has_food),                           // 11
    toBoolInt(entry.has_outdoor_space),                  // 12
    toBoolInt(entry.is_pet_friendly),                    // 13
    toBoolInt(entry.has_v60),                            // 14
    toBoolInt(entry.has_chemex),                         // 15
    toBoolInt(entry.has_filter_coffee),                  // 16
    toBoolInt(entry.has_slow_bar),                       // 17
    toBoolInt(entry.has_kitchen),                        // 18
    toBoolInt(entry.has_espresso),                       // 19
    toBoolInt(entry.has_aeropress),                      // 20
    toBoolInt(entry.has_french_press),                   // 21
    toBoolInt(entry.has_cold_brew),                      // 22
    toBoolInt(entry.has_batch_brew),                     // 23
    toBoolInt(entry.is_chain),                           // 24
    toBoolInt(entry.independent),                        // 25
    toBoolInt(entry.cityAreaRec),                        // 26
    entry.cityAreaRecExp || null,                        // 27
    toBoolInt(entry.workingRec),                         // 28
    toBoolInt(entry.interiorRec),                        // 29
    toBoolInt(entry.brewingRec),                         // 30
    entry.shopPromo || null,                             // 31
    entry.shopPromoCode || null,                         // 32
    entry.google_rating ?? null,                         // 33
    entry.google_review_count ?? null,                   // 34
    entry.rating ?? null,                                // 35
    entry.rating_count ?? null,                          // 36
    entry.google_place_id || null,                       // 37
    toBoolInt(entry.google_place_verified),              // 38
    entry.google_place_last_sync || null,                // 39
    entry.google_place_match_confidence ?? null,         // 40
    entry.google_business_status || null,                // 41
    entry.google_photo_reference || null,                // 42
    entry.google_formatted_address || null,              // 43
    entry.google_plus_code || null,                      // 44
    toJson(entry.google_types),                          // 45
    entry.google_places_last_updated || null,            // 46
    entry.google_coordinates_last_updated || null,       // 47
    entry.website || null,                               // 48
    entry.phone || null,                                 // 49
    entry.phone_number || null,                          // 50
    entry.instagram || null,                             // 51
    entry.facebook || null,                              // 52
    entry.tiktok || null,                                // 53
    toJson(entry.amenity_overrides),                     // 54
    toJson(entry.brew_method_overrides),                 // 55
    toJson(entry.menuData),                              // 56
    toJson(entry.public_tags),                           // 57
    toJson(entry.amenities),                             // 58
    entry.architects || null,                            // 59
    entry.price || null,                                 // 60
    entry.quality_tier || null,                          // 61
    toJson(entry.opening_hours),                         // 62
    toBoolInt(entry.is_open),                            // 63
    entry.localDensity ?? 0,                             // 64
    toJson(entry.research),                              // 65
    toJson(entry.citedSources),                          // 66
    toJson(entry.observations),                          // 67
    toJson(entry.visionData),                            // 68
    toJson(entry.preferenceProfile),                     // 69
    toBoolInt(entry.isDev),                              // 70
    toJson(entry.awards),                                // 71
    toJson(entry.source_articles),                       // 72
    toJson(entry.gallery),                               // 73
    toJson(entry.menus),                                 // 74
    entry.updatedAt || null,                             // 75
    entry.publishedAt || null,                           // 76
    entry.documentId,                                    // 77
  ).run();
  // Skip brand_*, location_*, city_area_*, country_code, featured_image_*, coffee_partner_* — they need populated relations
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function partialUpdateBean(db: D1Database, entry: any) {
  await db.prepare(`
    UPDATE beans SET
      name = ?1, slug = ?2, type = ?3, roast_level = ?4, process = ?5,
      short_description = ?6, full_description = ?7, learn_more_url = ?8,
      region = ?9, farm = ?10, producer = ?11, altitude = ?12,
      cupping_score = ?13, blend_components = ?14,
      updated_at = ?15, published_at = ?16
    WHERE document_id = ?17
  `).bind(
    entry.name,
    entry.slug || null,
    entry.type || null,
    entry.roastLevel || null,
    entry.process || null,
    entry.shortDescription || null,
    entry.fullDescription || null,
    entry.learnMoreUrl || null,
    entry.region || null,
    entry.farm || null,
    entry.producer || null,
    entry.altitude || null,
    entry.cuppingScore || null,
    entry.blendComponents || null,
    entry.updatedAt || null,
    entry.publishedAt || null,
    entry.documentId,
  ).run();
  // Skip photo_*, brand_document_id, junction tables — they need populated relations
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function partialUpdateCityArea(db: D1Database, entry: any) {
  await db.prepare(`
    UPDATE city_areas SET
      name = ?1, slug = ?2, area_group = ?3, description = ?4, summary = ?5,
      boundary_coordinates = ?6, center_coordinates = ?7,
      postcode = ?8, nearest_tube = ?9, coming_soon = ?10,
      updated_at = ?11, published_at = ?12
    WHERE document_id = ?13
  `).bind(
    entry.name,
    entry.slug || null,
    entry.group || null,
    entry.description || null,
    entry.summary || null,
    toJson(entry.boundary_coordinates),
    toJson(entry.center_coordinates),
    entry.postcode || null,
    entry.nearest_tube || null,
    toBoolInt(entry.comingSoon),
    entry.updatedAt || null,
    entry.publishedAt || null,
    entry.documentId,
  ).run();
  // Skip location_*, featured_image_* — they need populated relations
}

function toJson(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') return val;
  return JSON.stringify(val);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCoords(entry: any) {
  if (entry.coordinates?.lat && entry.coordinates?.lng) {
    return { lat: entry.coordinates.lat, lng: entry.coordinates.lng };
  }
  if (entry.latitude && entry.longitude) {
    return { lat: entry.latitude, lng: entry.longitude };
  }
  return { lat: null, lng: null };
}

function toBoolInt(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  return val ? 1 : 0;
}
