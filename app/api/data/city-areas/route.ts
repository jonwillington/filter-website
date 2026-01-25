import { NextResponse } from 'next/server';
import { getAllCityAreas } from '@/lib/api/locations';

export async function GET() {
  try {
    const cityAreas = await getAllCityAreas();

    return NextResponse.json(cityAreas, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Failed to fetch city areas:', error);
    return NextResponse.json(
      { error: 'Failed to fetch city areas' },
      { status: 500 }
    );
  }
}
