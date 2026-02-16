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

    if (!event || !model || !entry) {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
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

  await db.prepare(`
    INSERT OR REPLACE INTO shops (
      document_id, id, name, pref_name, slug, description,
      address, postal_code, neighbourhood, lat, lng,
      brand_document_id, brand_name, brand_type, brand_logo_url, brand_statement,
      has_wifi, has_food, has_outdoor_space, is_pet_friendly,
      has_v60, has_chemex, has_filter_coffee, has_slow_bar, has_kitchen,
      has_espresso, has_aeropress, has_french_press, has_cold_brew, has_batch_brew,
      google_rating, google_review_count, google_place_id,
      website, phone, phone_number, instagram, facebook, tiktok,
      description, quality_tier, local_density,
      created_at, updated_at, published_at
    ) VALUES (
      ?1, ?2, ?3, ?4, ?5, ?6,
      ?7, ?8, ?9, ?10, ?11,
      ?12, ?13, ?14, ?15, ?16,
      ?17, ?18, ?19, ?20,
      ?21, ?22, ?23, ?24, ?25,
      ?26, ?27, ?28, ?29, ?30,
      ?31, ?32, ?33,
      ?34, ?35, ?36, ?37, ?38, ?39,
      ?6, ?40, ?41,
      ?42, ?43, ?44
    )
  `).bind(
    entry.documentId,
    entry.id || null,
    entry.name,
    entry.prefName || null,
    entry.slug || null,
    entry.description || null,
    entry.address || null,
    entry.postal_code || null,
    entry.neighbourhood || null,
    coords.lat,
    coords.lng,
    entry.brand?.documentId || null,
    entry.brand?.name || null,
    entry.brand?.type || null,
    entry.brand?.logo?.url || null,
    entry.brand?.statement || null,
    toBoolInt(entry.has_wifi),
    toBoolInt(entry.has_food),
    toBoolInt(entry.has_outdoor_space),
    toBoolInt(entry.is_pet_friendly),
    toBoolInt(entry.has_v60),
    toBoolInt(entry.has_chemex),
    toBoolInt(entry.has_filter_coffee),
    toBoolInt(entry.has_slow_bar),
    toBoolInt(entry.has_kitchen),
    toBoolInt(entry.has_espresso),
    toBoolInt(entry.has_aeropress),
    toBoolInt(entry.has_french_press),
    toBoolInt(entry.has_cold_brew),
    toBoolInt(entry.has_batch_brew),
    entry.google_rating || null,
    entry.google_review_count || null,
    entry.google_place_id || null,
    entry.website || null,
    entry.phone || null,
    entry.phone_number || null,
    entry.instagram || null,
    entry.facebook || null,
    entry.tiktok || null,
    entry.quality_tier || null,
    entry.localDensity || 0,
    entry.createdAt || null,
    entry.updatedAt || null,
    entry.publishedAt || null,
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
