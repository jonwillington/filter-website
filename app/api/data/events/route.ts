import { NextResponse } from 'next/server';
import { getAllEvents } from '@/lib/api/events';

export async function GET() {
  try {
    const events = await getAllEvents();

    return NextResponse.json(events, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}
