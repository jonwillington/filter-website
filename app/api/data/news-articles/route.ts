import { NextResponse } from 'next/server';
import { getAllNewsArticles } from '@/lib/api/news-articles';

export async function GET() {
  try {
    const articles = await getAllNewsArticles();

    return NextResponse.json(articles, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Failed to fetch news articles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news articles' },
      { status: 500 }
    );
  }
}
