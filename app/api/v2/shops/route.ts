import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/api/d1';

/**
 * GET /api/v2/shops — Shop data for map/list from D1
 *
 * Returns all fields needed for map pins, list cards, and filtering.
 * Full brand detail (beans, suppliers, story) fetched per-shop via
 * /api/v2/shops/[id].
 *
 * Query params:
 *   ?country=tr   — filter by ISO country code
 */
export async function GET(request: NextRequest) {
  try {
    const db = await getDB();
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country');

    let query = `
      SELECT
        s.document_id,
        s.id,
        s.name,
        s.slug,
        s.pref_name,
        s.description,
        s.address,
        s.neighbourhood,
        s.lat,
        s.lng,
        s.country_code,
        s.local_density,
        s.quality_tier,

        -- Brand (denormalized)
        s.brand_document_id,
        s.brand_name,
        s.brand_type,
        s.brand_logo_url,
        s.brand_statement,
        b.roast_own_beans AS brand_roast_own_beans,

        -- Location
        s.location_document_id,
        s.location_name,
        s.location_slug,

        -- City area
        s.city_area_document_id,
        s.city_area_name,
        s.city_area_group,

        -- Featured image
        s.featured_image_url,
        s.featured_image_formats,

        -- Ratings
        s.google_rating,
        s.google_review_count,

        -- Flags
        s.independent,
        s.is_chain,
        s.city_area_rec,
        s.working_rec,
        s.interior_rec,
        s.brewing_rec,

        -- Amenities & brew methods (used for filtering)
        s.has_wifi,
        s.has_food,
        s.has_outdoor_space,
        s.is_pet_friendly,
        s.has_v60,
        s.has_chemex,
        s.has_filter_coffee,
        s.has_slow_bar,
        s.has_kitchen,
        s.has_espresso,
        s.has_aeropress,
        s.has_french_press,
        s.has_cold_brew,
        s.has_batch_brew,

        -- Tags
        s.public_tags

      FROM shops s
      LEFT JOIN brands b ON b.document_id = s.brand_document_id
    `;

    const params: string[] = [];
    if (country) {
      query += ' WHERE s.country_code = ?1';
      params.push(country.toUpperCase());
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
    console.error('D1 shops query failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shops' },
      { status: 500 }
    );
  }
}
