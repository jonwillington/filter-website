import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/api/d1';
import { SHOP_BRAND_SELECT, d1RowToShop } from '@/lib/api/d1-queries';

/**
 * GET /api/v2/shops — Shop data for map/list from D1
 *
 * Returns transformed Shop objects with full brand data.
 * Only beans and suppliers are deferred to /api/v2/shops/[id].
 *
 * Query params:
 *   ?country=tr              — filter by ISO country code
 *   ?location=<documentId>   — filter by location documentId
 */
export async function GET(request: NextRequest) {
  try {
    const db = await getDB();
    const { searchParams } = new URL(request.url);
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

    let query = SHOP_BRAND_SELECT;
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY s.name';

    const result = params.length > 0
      ? await db.prepare(query).bind(...params).all()
      : await db.prepare(query).all();

    const shops = result.results.map(d1RowToShop);

    return NextResponse.json(shops, {
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
