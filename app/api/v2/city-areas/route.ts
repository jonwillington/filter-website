import { NextResponse } from 'next/server';
import { getDB } from '@/lib/api/d1';
import { d1RowToCityArea } from '@/lib/api/d1-queries';

/**
 * GET /api/v2/city-areas — All city areas from D1
 */
export async function GET() {
  try {
    const db = await getDB();
    const result = await db.prepare('SELECT * FROM city_areas ORDER BY name').all();
    const cityAreas = result.results.map(d1RowToCityArea);

    return NextResponse.json(cityAreas, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('D1 city-areas query failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch city areas' },
      { status: 500 }
    );
  }
}
