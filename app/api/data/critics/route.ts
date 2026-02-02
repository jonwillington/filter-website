import { NextResponse } from 'next/server';
import { getAllCritics } from '@/lib/api/critics';

export async function GET() {
  try {
    const critics = await getAllCritics();

    return NextResponse.json(critics, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Failed to fetch critics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch critics' },
      { status: 500 }
    );
  }
}
