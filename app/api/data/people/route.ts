import { NextResponse } from 'next/server';
import { getAllPeople } from '@/lib/api/people';

export async function GET() {
  try {
    const people = await getAllPeople();

    return NextResponse.json(people, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Failed to fetch people:', error);
    return NextResponse.json(
      { error: 'Failed to fetch people' },
      { status: 500 }
    );
  }
}
