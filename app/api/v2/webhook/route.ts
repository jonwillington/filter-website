import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/api/d1';

/**
 * POST /api/v2/webhook — Strapi webhook handler
 *
 * Receives create/update/delete events from Strapi and syncs
 * the relevant row in D1.
 *
 * Expected headers:
 *   X-Webhook-Secret: <shared secret>
 *
 * Expected body (Strapi v5 webhook format):
 *   {
 *     "event": "entry.create" | "entry.update" | "entry.delete",
 *     "model": "shop" | "brand" | "bean",
 *     "entry": { ...full entry data... }
 *   }
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
    const isDelete = event === 'entry.delete';
    const documentId = entry.documentId;

    if (!documentId) {
      return NextResponse.json({ error: 'Missing documentId' }, { status: 400 });
    }

    switch (model) {
      case 'shop': {
        if (isDelete) {
          await db.prepare('DELETE FROM shops WHERE document_id = ?1').bind(documentId).run();
        } else {
          await upsertShop(db, entry);
        }
        break;
      }
      case 'brand': {
        if (isDelete) {
          await db.prepare('DELETE FROM brands WHERE document_id = ?1').bind(documentId).run();
          // Also update denormalized brand fields in shops
          await db.prepare(`
            UPDATE shops SET brand_name = NULL, brand_type = NULL,
                             brand_logo_url = NULL, brand_statement = NULL
            WHERE brand_document_id = ?1
          `).bind(documentId).run();
        } else {
          await upsertBrand(db, entry);
          // Update denormalized brand fields in all shops with this brand
          await db.prepare(`
            UPDATE shops SET brand_name = ?1, brand_type = ?2,
                             brand_logo_url = ?3, brand_statement = ?4
            WHERE brand_document_id = ?5
          `).bind(
            entry.name,
            entry.type || null,
            entry.logo?.url || null,
            entry.statement || null,
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
        } else {
          await upsertBean(db, entry);
        }
        break;
      }
      case 'location': {
        if (isDelete) {
          await db.prepare('DELETE FROM locations WHERE document_id = ?1').bind(documentId).run();
          // Null out denormalized location fields in shops
          await db.prepare(`
            UPDATE shops SET location_name = NULL, location_slug = NULL
            WHERE location_document_id = ?1
          `).bind(documentId).run();
          // Null out denormalized location fields in city_areas
          await db.prepare(`
            UPDATE city_areas SET location_name = NULL, location_slug = NULL
            WHERE location_document_id = ?1
          `).bind(documentId).run();
        } else {
          await upsertLocation(db, entry);
          // Cascade denormalized location fields to shops
          await db.prepare(`
            UPDATE shops SET location_name = ?1, location_slug = ?2
            WHERE location_document_id = ?3
          `).bind(entry.name, entry.slug || null, documentId).run();
          // Cascade denormalized location fields to city_areas
          await db.prepare(`
            UPDATE city_areas SET location_name = ?1, location_slug = ?2
            WHERE location_document_id = ?3
          `).bind(entry.name, entry.slug || null, documentId).run();
        }
        break;
      }
      case 'country': {
        if (isDelete) {
          await db.prepare('DELETE FROM countries WHERE document_id = ?1').bind(documentId).run();
          // Null out denormalized country fields in locations
          await db.prepare(`
            UPDATE locations SET country_name = NULL, country_code = NULL,
                                 country_primary_color = NULL, country_secondary_color = NULL
            WHERE country_document_id = ?1
          `).bind(documentId).run();
        } else {
          await upsertCountry(db, entry);
          // Cascade denormalized country fields to locations
          await db.prepare(`
            UPDATE locations SET country_name = ?1, country_code = ?2,
                                 country_primary_color = ?3, country_secondary_color = ?4
            WHERE country_document_id = ?5
          `).bind(
            entry.name,
            entry.code || null,
            entry.primaryColor || null,
            entry.secondaryColor || null,
            documentId
          ).run();
        }
        break;
      }
      case 'city-area': {
        if (isDelete) {
          await db.prepare('DELETE FROM city_areas WHERE document_id = ?1').bind(documentId).run();
          // Null out denormalized city_area fields in shops
          await db.prepare(`
            UPDATE shops SET city_area_name = NULL, city_area_group = NULL
            WHERE city_area_document_id = ?1
          `).bind(documentId).run();
        } else {
          await upsertCityArea(db, entry);
          // Cascade denormalized city_area fields to shops
          await db.prepare(`
            UPDATE shops SET city_area_name = ?1, city_area_group = ?2
            WHERE city_area_document_id = ?3
          `).bind(
            entry.name,
            entry.group || null,
            documentId
          ).run();
        }
        break;
      }
      default:
        return NextResponse.json({ message: `Unhandled model: ${model}` }, { status: 200 });
    }

    return NextResponse.json({ success: true, event, model, documentId });
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
      ?72, ?73,
      ?74, ?75, ?76, ?77, ?78,
      ?79,
      ?80, ?81, ?82, ?83, ?84,
      ?85, ?86, ?87,
      ?88, ?89, ?90,
      ?91, ?92, ?93
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
    toJson(entry.public_tags),                           // 72
    toJson(entry.amenities),                             // 73
    entry.architects || null,                            // 74
    entry.price || null,                                 // 75
    entry.quality_tier || null,                          // 76
    toJson(entry.opening_hours),                         // 77
    toBoolInt(entry.is_open),                            // 78
    entry.localDensity ?? 0,                             // 79
    toJson(entry.research),                              // 80
    toJson(entry.citedSources),                          // 81
    toJson(entry.observations),                          // 82
    toJson(entry.visionData),                            // 83
    toJson(entry.preferenceProfile),                     // 84
    cp?.documentId || null,                              // 85
    cp?.name || null,                                    // 86
    cp?.logo?.url || null,                               // 87
    toBoolInt(entry.isDev),                              // 88
    toJson(entry.awards),                                // 89
    toJson(entry.source_articles),                       // 90
    entry.createdAt || null,                             // 91
    entry.updatedAt || null,                             // 92
    entry.publishedAt || null,                           // 93
  ).run();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function upsertBrand(db: D1Database, entry: any) {
  // Simplified upsert for webhook — just the core fields
  // Full re-seed handles all fields
  await db.prepare(`
    INSERT OR REPLACE INTO brands (
      document_id, id, name, type, role, description, story, statement,
      founded, founder, logo_url, logo_formats,
      website, instagram, facebook, tiktok,
      roast_own_beans, own_roast_desc,
      equipment, awards, research, cited_sources,
      created_at, updated_at, published_at
    ) VALUES (
      ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8,
      ?9, ?10, ?11, ?12,
      ?13, ?14, ?15, ?16,
      ?17, ?18,
      ?19, ?20, ?21, ?22,
      ?23, ?24, ?25
    )
  `).bind(
    entry.documentId,
    entry.id || null,
    entry.name,
    entry.type || null,
    entry.role || null,
    entry.description || null,
    entry.story || null,
    entry.statement || null,
    entry.founded || null,
    entry.Founder || entry.founder || null,
    entry.logo?.url || null,
    entry.logo?.formats
      ? JSON.stringify(entry.logo.formats)
      : null,
    entry.website || null,
    entry.instagram || null,
    entry.facebook || null,
    entry.tiktok || null,
    toBoolInt(entry.roastOwnBeans),
    entry.ownRoastDesc || null,
    entry.equipment
      ? JSON.stringify(entry.equipment)
      : null,
    entry.awards
      ? JSON.stringify(entry.awards)
      : null,
    entry.research
      ? JSON.stringify(entry.research)
      : null,
    entry.citedSources
      ? JSON.stringify(entry.citedSources)
      : null,
    entry.createdAt || null,
    entry.updatedAt || null,
    entry.publishedAt || null,
  ).run();
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
      bg_image_url, bg_image_formats,
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
      ?17, ?18,
      ?19, ?20, ?21, ?22,
      ?23, ?24, ?25,
      ?26, ?27,
      ?28, ?29, ?30
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
      region_document_id, region_name, region_coming_soon,
      created_at, updated_at, published_at
    ) VALUES (
      ?1,  ?2,  ?3,  ?4,  ?5,  ?6,
      ?7,  ?8,
      ?9,  ?10, ?11, ?12,
      ?13, ?14, ?15,
      ?16, ?17, ?18
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
      location_document_id, location_name, location_slug,
      location_country_name, location_country_code,
      created_at, updated_at, published_at
    ) VALUES (
      ?1,  ?2,  ?3,  ?4,  ?5,  ?6,  ?7,
      ?8,  ?9,
      ?10,
      ?11, ?12, ?13,
      ?14, ?15,
      ?16, ?17, ?18
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
