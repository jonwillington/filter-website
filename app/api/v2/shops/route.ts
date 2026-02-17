import { NextRequest, NextResponse } from 'next/server';
import { getDB, proxyToProd } from '@/lib/api/d1';

/**
 * GET /api/v2/shops — Shop data for map/list from D1
 *
 * Returns raw D1 rows (snake_case with b_ brand prefix).
 * Client transforms to TypeScript Shop shape via d1RowToShop.
 *
 * Uses two separate queries (shops + brands) to avoid D1's column limit,
 * then merges brand data with b_ prefix in JS.
 *
 * Query params:
 *   ?country=tr              — filter by ISO country code
 *   ?location=<documentId>   — filter by location documentId
 */
export async function GET(request: NextRequest) {
  try {
    const db = await getDB();
    if (!db) {
      const { searchParams } = new URL(request.url);
      const qs = searchParams.toString();
      return proxyToProd(`/api/v2/shops${qs ? `?${qs}` : ''}`);
    }
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country');
    const location = searchParams.get('location');

    // Build WHERE conditions for shops query
    const conditions: string[] = [];
    const params: string[] = [];
    if (country) {
      params.push(country.toUpperCase());
      conditions.push(`country_code = ?${params.length}`);
    }
    if (location) {
      params.push(location);
      conditions.push(`location_document_id = ?${params.length}`);
    }

    let shopsQuery = 'SELECT * FROM shops';
    if (conditions.length > 0) {
      shopsQuery += ' WHERE ' + conditions.join(' AND ');
    }
    shopsQuery += ' ORDER BY name';

    // Fetch shops and brands in parallel (two separate queries avoid D1 column limit)
    const [shopsResult, brandsResult] = await Promise.all([
      params.length > 0
        ? db.prepare(shopsQuery).bind(...params).all()
        : db.prepare(shopsQuery).all(),
      db.prepare('SELECT * FROM brands').all(),
    ]);

    // Index brands by document_id for fast lookup
    const brandsMap = new Map<string, Record<string, unknown>>();
    for (const b of brandsResult.results) {
      brandsMap.set(b.document_id as string, b as Record<string, unknown>);
    }

    // Merge brand data into shop rows with b_ prefix (matches client d1RowToShop expectations)
    const rows = shopsResult.results.map(shop => {
      const brandDocId = shop.brand_document_id as string | null;
      if (!brandDocId) return shop;

      const brand = brandsMap.get(brandDocId);
      if (!brand) return shop;

      // Add all brand columns with b_ prefix
      const merged: Record<string, unknown> = { ...(shop as Record<string, unknown>) };
      for (const [key, value] of Object.entries(brand)) {
        merged[`b_${key}`] = value;
      }
      return merged;
    });

    return NextResponse.json(rows, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('D1 shops query failed:', message);
    return NextResponse.json(
      { error: 'Failed to fetch shops' },
      { status: 500 }
    );
  }
}
