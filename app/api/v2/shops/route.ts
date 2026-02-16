import { NextRequest, NextResponse } from 'next/server';
import { getAllShopsD1, getShopsByLocationD1 } from '@/lib/api/d1-queries';

/**
 * GET /api/v2/shops — Shop data for map/list from D1
 *
 * Returns transformed Shop objects with full brand data.
 * Only beans and suppliers are deferred to /api/v2/shops/[id].
 *
 * Query params:
 *   ?country=tr              — filter by ISO country code
 *   ?location=<documentId>   — filter by location documentId
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location');
    const country = searchParams.get('country');

    let shops;

    if (location) {
      // Optimized: location-scoped query
      shops = await getShopsByLocationD1(location);
    } else {
      // All shops
      shops = await getAllShopsD1();
    }

    if (!shops) {
      return NextResponse.json(
        { error: 'D1 not available' },
        { status: 503 }
      );
    }

    // Apply country filter if specified (client-side filter on already-transformed data)
    if (country) {
      const countryUpper = country.toUpperCase();
      shops = shops.filter(s => s.country?.code === countryUpper);
    }

    return NextResponse.json(shops, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('D1 shops query failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shops' },
      { status: 500 }
    );
  }
}
