import { NextResponse } from 'next/server';
import { getDB } from '@/lib/api/d1';
import { d1RowToCountry } from '@/lib/api/d1-queries';

/**
 * GET /api/v2/countries — All countries from D1
 */
export async function GET() {
  try {
    const db = await getDB();
    const result = await db.prepare('SELECT * FROM countries ORDER BY name').all();
    const countries = result.results.map(d1RowToCountry);

    return NextResponse.json(countries, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('D1 countries query failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch countries' },
      { status: 500 }
    );
  }
}
