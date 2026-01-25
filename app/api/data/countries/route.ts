import { NextResponse } from 'next/server';
import { getAllCountries } from '@/lib/api/countries';

export async function GET() {
  try {
    const countries = await getAllCountries();

    return NextResponse.json(countries, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Failed to fetch countries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch countries' },
      { status: 500 }
    );
  }
}
