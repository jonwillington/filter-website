import { NextResponse } from 'next/server';
import { getAllShops } from '@/lib/api/shops';

export async function GET() {
  try {
    const shops = await getAllShops();

    return NextResponse.json(shops, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Failed to fetch shops:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shops' },
      { status: 500 }
    );
  }
}
