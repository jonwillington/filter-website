import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/api/d1';

/**
 * GET /api/v2/shops — Shop summaries for map/list
 *
 * Returns lightweight rows (~100 bytes each) with just enough data
 * for map pins and list cards.  Full detail is fetched per-shop via
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
        document_id   AS documentId,
        name,
        slug,
        pref_name     AS prefName,
        lat,
        lng,
        brand_name    AS brandName,
        brand_type    AS brandType,
        brand_logo_url AS brandLogoUrl,
        brand_statement AS brandStatement,
        brand_document_id AS brandDocumentId,
        country_code  AS countryCode,
        location_name AS locationName,
        location_slug AS locationSlug,
        city_area_name AS cityAreaName,
        city_area_group AS cityAreaGroup,
        google_rating AS googleRating,
        local_density AS localDensity,
        featured_image_url AS featuredImageUrl,
        quality_tier  AS qualityTier
      FROM shops
    `;

    const params: string[] = [];
    if (country) {
      query += ' WHERE country_code = ?1';
      params.push(country.toUpperCase());
    }

    query += ' ORDER BY name';

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
