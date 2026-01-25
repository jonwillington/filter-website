import { NextResponse } from 'next/server';
import { getAllLocations } from '@/lib/api/locations';

export async function GET() {
  try {
    const locations = await getAllLocations();

    return NextResponse.json(locations, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Failed to fetch locations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch locations' },
      { status: 500 }
    );
  }
}
