import { NextResponse } from 'next/server';
import { getDB } from '@/lib/api/d1';
import { d1RowToBrand } from '@/lib/api/d1-queries';

/**
 * GET /api/v2/brands — All brands from D1
 */
export async function GET() {
  try {
    const db = await getDB();
    const result = await db.prepare('SELECT * FROM brands ORDER BY name').all();
    const brands = result.results.map(d1RowToBrand);

    return NextResponse.json(brands, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('D1 brands query failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch brands' },
      { status: 500 }
    );
  }
}
