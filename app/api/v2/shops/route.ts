import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/api/d1';

/**
 * GET /api/v2/shops — Shop data for map/list from D1
 *
 * Returns raw D1 rows (snake_case with b_ brand prefix).
 * Client transforms to TypeScript Shop shape via d1RowToShop.
 *
 * Query params:
 *   ?country=tr              — filter by ISO country code
 *   ?location=<documentId>   — filter by location documentId
 *   ?debug=1                 — return error details
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const debug = searchParams.get('debug') === '1';

  try {
    const db = await getDB();
    const country = searchParams.get('country');
    const location = searchParams.get('location');

    const conditions: string[] = [];
    const params: string[] = [];
    if (country) {
      params.push(country.toUpperCase());
      conditions.push(`s.country_code = ?${params.length}`);
    }
    if (location) {
      params.push(location);
      conditions.push(`s.location_document_id = ?${params.length}`);
    }

    // Inline query to avoid importing d1-queries.ts module
    let query = `
      SELECT
        s.document_id, s.id, s.name, s.slug, s.pref_name, s.description,
        s.address, s.postal_code, s.neighbourhood,
        s.lat, s.lng, s.country_code, s.local_density, s.quality_tier,
        s.location_document_id, s.location_name, s.location_slug,
        s.city_area_document_id, s.city_area_name, s.city_area_group,
        s.featured_image_url, s.featured_image_formats,
        s.google_rating, s.google_review_count, s.rating, s.rating_count,
        s.independent, s.is_chain,
        s.city_area_rec, s.city_area_rec_exp, s.working_rec, s.interior_rec, s.brewing_rec,
        s.shop_promo, s.shop_promo_code,
        s.has_wifi, s.has_food, s.has_outdoor_space, s.is_pet_friendly,
        s.has_v60, s.has_chemex, s.has_filter_coffee, s.has_slow_bar, s.has_kitchen,
        s.has_espresso, s.has_aeropress, s.has_french_press, s.has_cold_brew, s.has_batch_brew,
        s.public_tags, s.amenities,
        s.website, s.phone, s.phone_number, s.instagram, s.facebook, s.tiktok,
        s.google_place_id, s.google_formatted_address,
        s.coffee_partner_document_id, s.coffee_partner_name, s.coffee_partner_logo_url,
        s.opening_hours, s.research, s.cited_sources, s.vision_data, s.observations,
        s.gallery, s.menus,
        s.awards AS shop_awards, s.is_dev, s.source_articles,
        s.architects, s.price,
        s.created_at, s.updated_at, s.published_at,
        -- Full brand
        b.document_id AS b_document_id, b.id AS b_id, b.name AS b_name,
        b.type AS b_type, b.role AS b_role, b.description AS b_description,
        b.story AS b_story, b.statement AS b_statement,
        b.founded AS b_founded, b.founder AS b_founder, b.hq AS b_hq,
        b.price AS b_price, b.quality_tier AS b_quality_tier,
        b.logo_url AS b_logo_url, b.logo_formats AS b_logo_formats,
        b.bg_image_url AS b_bg_image_url, b.bg_image_formats AS b_bg_image_formats,
        b.website AS b_website, b.instagram AS b_instagram, b.facebook AS b_facebook,
        b.tiktok AS b_tiktok, b.twitter AS b_twitter, b.youtube AS b_youtube,
        b.phone AS b_phone, b.whatsapp AS b_whatsapp, b.line AS b_line,
        b.roast_own_beans AS b_roast_own_beans, b.own_roast_desc AS b_own_roast_desc,
        b.own_bean_link AS b_own_bean_link,
        b.specializes_light AS b_specializes_light, b.specializes_medium AS b_specializes_medium,
        b.specializes_dark AS b_specializes_dark,
        b.has_wifi AS b_has_wifi, b.has_food AS b_has_food,
        b.has_outdoor_space AS b_has_outdoor_space, b.is_pet_friendly AS b_is_pet_friendly,
        b.has_espresso AS b_has_espresso, b.has_filter_coffee AS b_has_filter_coffee,
        b.has_v60 AS b_has_v60, b.has_chemex AS b_has_chemex,
        b.has_aeropress AS b_has_aeropress, b.has_french_press AS b_has_french_press,
        b.has_cold_brew AS b_has_cold_brew, b.has_batch_brew AS b_has_batch_brew,
        b.has_siphon AS b_has_siphon, b.oat_milk AS b_oat_milk, b.plant_milk AS b_plant_milk,
        b.equipment AS b_equipment, b.awards AS b_awards,
        b.research AS b_research, b.cited_sources AS b_cited_sources,
        b.observations AS b_observations,
        b.is_dev AS b_is_dev, b.created_at AS b_created_at,
        b.updated_at AS b_updated_at, b.published_at AS b_published_at
      FROM shops s
      LEFT JOIN brands b ON b.document_id = s.brand_document_id
    `;

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY s.name';

    const result = params.length > 0
      ? await db.prepare(query).bind(...params).all()
      : await db.prepare(query).all();

    return NextResponse.json(result.results, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error('D1 shops query failed:', message, stack);

    if (debug) {
      return NextResponse.json(
        { error: 'Failed to fetch shops', message, stack },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to fetch shops' },
      { status: 500 }
    );
  }
}
