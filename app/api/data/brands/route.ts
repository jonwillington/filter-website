import { NextResponse } from 'next/server';
import { getAllBrands } from '@/lib/api/brands';

export async function GET() {
  try {
    const brandMap = await getAllBrands();
    const brands = Array.from(brandMap.values());

    return NextResponse.json(brands, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Failed to fetch brands:', error);
    return NextResponse.json(
      { error: 'Failed to fetch brands' },
      { status: 500 }
    );
  }
}
