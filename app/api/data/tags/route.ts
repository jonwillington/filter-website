import { NextResponse } from 'next/server';
import { getAllTags } from '@/lib/api/tags';

export async function GET() {
  try {
    const tags = await getAllTags();

    return NextResponse.json(tags, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Failed to fetch tags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}
