import { NewsArticle } from '../types';
import { strapiGetAll } from './strapiClient';
import { getCached, setCache, loadFromStaticFile } from './cache';

// Populate params for news articles
const NEWS_ARTICLE_POPULATE = 'populate=featured_image&populate=source.logo&populate=brands_mentioned.logo&populate=shops_mentioned.brand.logo&populate=shops_mentioned.featured_image&populate=shops_mentioned.location&populate=people_mentioned&populate=locations_mentioned';

/**
 * Fetch all news articles from Strapi
 */
export async function getAllNewsArticles(): Promise<NewsArticle[]> {
  const cacheKey = 'news-articles:all';
  const cached = getCached<NewsArticle[]>(cacheKey);
  if (cached) return cached;

  // Try to load from static file first (prefetched data)
  const staticData = await loadFromStaticFile<NewsArticle[]>('news-articles');
  if (staticData && staticData.length > 0) {
    console.log('[NewsArticles API] Loaded from static file:', staticData.length);
    setCache(cacheKey, staticData);
    return staticData;
  }

  try {
    const articles = await strapiGetAll<NewsArticle>(
      '/news-articles',
      NEWS_ARTICLE_POPULATE,
      { skipNextCache: true }
    );

    // Sort by published_date descending (most recent first)
    articles.sort((a, b) => {
      const dateA = new Date(a.published_date).getTime();
      const dateB = new Date(b.published_date).getTime();
      return dateB - dateA;
    });

    setCache(cacheKey, articles);
    return articles;
  } catch (error) {
    console.error('Failed to fetch news articles:', error);
    return [];
  }
}
