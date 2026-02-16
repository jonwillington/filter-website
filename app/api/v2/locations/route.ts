import { NextResponse } from 'next/server';
import { getDB } from '@/lib/api/d1';
import { d1RowToLocation } from '@/lib/api/d1-queries';

/**
 * GET /api/v2/locations — All locations from D1
 */
export async function GET() {
  try {
    const db = await getDB();
    const result = await db.prepare('SELECT * FROM locations ORDER BY name').all();
    const locations = result.results.map(d1RowToLocation);

    return NextResponse.json(locations, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('D1 locations query failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch locations' },
      { status: 500 }
    );
  }
}
