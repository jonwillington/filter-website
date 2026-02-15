'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { NewsArticle, Shop, Country } from '@/lib/types';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useDrawerTransition } from '@/lib/hooks/useDrawerTransition';
import { getMediaUrl } from '@/lib/utils';
import { getRelativeTimeLabel } from '@/lib/utils/dateUtils';
import { format } from 'date-fns';
import { ArrowUpRight } from 'lucide-react';
import { ShopListItem } from '@/components/shop';

interface LatestNewsProps {
  articles: NewsArticle[];
  countries?: Country[];
  onShopSelect?: (shop: Shop) => void;
}

const NEWS_TYPE_LABELS: Record<string, string> = {
  industry: 'Industry',
  opening: 'Opening',
  closing: 'Closing',
  review: 'Review',
  interview: 'Interview',
  event: 'Event',
  event_coverage: 'Event',
  guide: 'Guide',
  opinion: 'Opinion',
  award: 'Award',
  feature: 'Feature',
  competition_result: 'Competition',
  product_launch: 'Launch',
  other: 'News',
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Derive a city label and country name from locations_mentioned or shops_mentioned */
function getCityInfo(article: NewsArticle): { city: string; countryName: string | null } | null {
  const locs = article.locations_mentioned;
  if (locs && locs.length > 0) {
    const city = locs.map((l) => l.name).filter(Boolean).join(', ');
    const countryName = (locs[0] as { country_name?: string }).country_name || null;
    return city ? { city, countryName } : null;
  }
  // Fallback: first shop's location
  const shop = article.shops_mentioned?.[0];
  if (shop?.location) {
    const countryName = shop.location.country?.name || null;
    return { city: shop.location.name, countryName };
  }
  return null;
}

const getFlagUrl = (code: string) =>
  `https://flagcdn.com/w40/${code.toLowerCase()}.png`;

export function LatestNews({ articles, countries = [], onShopSelect }: LatestNewsProps) {
  const { ref: sectionRef, revealed: sectionRevealed } = useScrollReveal();
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);

  // Build country name → code lookup
  const countryCodeMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of countries) {
      if (c.name && c.code) map.set(c.name.toLowerCase(), c.code);
    }
    return map;
  }, [countries]);

  // Sort by published_date descending, take 5
  const displayArticles = useMemo(() => {
    return [...articles]
      .sort((a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime())
      .slice(0, 5);
  }, [articles]);

  const effectiveSelectedId = selectedArticleId ?? displayArticles[0]?.documentId ?? null;

  const selectedArticle = useMemo(() => {
    return displayArticles.find((a) => a.documentId === effectiveSelectedId) ?? displayArticles[0] ?? null;
  }, [displayArticles, effectiveSelectedId]);

  const { displayedItem, isTransitioning } = useDrawerTransition({
    item: selectedArticle,
    getKey: (a) => a?.documentId ?? '',
  });

  // All hooks above — safe to early return
  if (displayArticles.length === 0 || !displayedItem) return null;

  return (
    <div
      ref={sectionRef}
      style={{
        opacity: sectionRevealed ? 1 : 0,
        transform: sectionRevealed ? 'translateY(0)' : 'translateY(24px)',
        transition: 'opacity 0.7s ease-out, transform 0.7s ease-out',
      }}
    >
        {/* Mobile: horizontal scroll chips */}
        <div className="lg:hidden mb-6">
          {/* Title outside card on mobile */}
          <h2 className="font-display text-2xl md:text-3xl text-primary mb-4">
            Latest News
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
            {displayArticles.map((article) => {
              const isSelected = article.documentId === effectiveSelectedId;
              const sourceLogoUrl = getMediaUrl(article.source?.logo);
              return (
                <button
                  key={article.documentId}
                  onClick={() => setSelectedArticleId(article.documentId)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-full flex-shrink-0 transition-all duration-200 max-w-[220px] ${
                    isSelected
                      ? 'bg-gray-200 dark:bg-white/[0.12] ring-1 ring-gray-300 dark:ring-white/20'
                      : 'bg-gray-100 dark:bg-white/[0.04] hover:bg-gray-150 dark:hover:bg-white/[0.07]'
                  }`}
                >
                  {sourceLogoUrl && (
                    <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-white/10">
                      <Image
                        src={sourceLogoUrl}
                        alt=""
                        width={20}
                        height={20}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  )}
                  <span className="text-sm font-medium text-primary truncate">
                    {article.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Card container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* LEFT: Header + Article list (desktop) */}
          <div className="hidden lg:flex lg:flex-col lg:col-span-4 bg-surface rounded-2xl border border-border-default overflow-hidden">
              {/* Header inside card */}
              <div className="px-6 pt-7 pb-5 border-b border-border-default">
                <h2 className="font-display text-2xl xl:text-3xl text-primary leading-none">
                  Latest News
                </h2>
                <p className="text-text-secondary text-sm mt-2">
                  What&apos;s happening in specialty coffee
                </p>
              </div>

              {/* Article list */}
              <div className="flex-1 overflow-y-auto">
                {displayArticles.map((article, i) => {
                  const isSelected = article.documentId === effectiveSelectedId;
                  const typeLabel = article.news_type ? NEWS_TYPE_LABELS[article.news_type] || 'News' : null;
                  const sourceLogoUrl = getMediaUrl(article.source?.logo);
                  const cityInfo = getCityInfo(article);
                  const countryCode = cityInfo?.countryName
                    ? countryCodeMap.get(cityInfo.countryName.toLowerCase()) || null
                    : null;
                  return (
                    <button
                      key={article.documentId}
                      onClick={() => setSelectedArticleId(article.documentId)}
                      className={`w-full text-left flex gap-3.5 px-5 py-4 transition-all duration-200 ${
                        isSelected
                          ? 'bg-gray-100 dark:bg-white/[0.06] border-l-2 border-l-accent'
                          : 'hover:bg-gray-50 dark:hover:bg-white/[0.03] border-l-2 border-l-transparent'
                      } ${i < displayArticles.length - 1 ? 'border-b border-border-default' : ''}`}
                    >
                      {/* Date badge + source logo */}
                      <div className="flex-shrink-0 mt-0.5 flex items-center gap-2">
                        <div className="w-11 h-11 rounded-lg bg-gray-100 dark:bg-white/10 flex flex-col items-center justify-center">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary leading-none">
                            {format(new Date(article.published_date), 'MMM')}
                          </span>
                          <span className="text-base font-semibold text-primary leading-tight">
                            {format(new Date(article.published_date), 'd')}
                          </span>
                        </div>
                        {sourceLogoUrl ? (
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 dark:bg-white/10">
                            <Image
                              src={sourceLogoUrl}
                              alt={article.source?.name || article.source_name}
                              width={32}
                              height={32}
                              className="object-cover w-full h-full"
                            />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium bg-gray-200 text-gray-500 dark:bg-white/10 dark:text-white/50">
                            {(article.source?.name || article.source_name).charAt(0)}
                          </div>
                        )}
                      </div>

                      {/* Text content */}
                      <div className="flex-1 min-w-0">
                        {/* Meta row: chip + city with flag */}
                        <div className="flex items-center gap-1.5 text-xs mb-1">
                          {typeLabel && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-border-default bg-white dark:bg-white/10 text-[11px] font-mono text-primary flex-shrink-0">
                              {typeLabel}
                            </span>
                          )}
                          {article.importance === 'breaking' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-900/30 text-[11px] font-mono text-red-700 dark:text-red-300 flex-shrink-0">
                              Breaking
                            </span>
                          )}
                          {cityInfo && (
                            <span className="flex items-center gap-1 text-text-secondary truncate">
                              {cityInfo.city}
                              {countryCode && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={getFlagUrl(countryCode)}
                                  alt={cityInfo.countryName || ''}
                                  className="w-3.5 h-3.5 rounded-full object-cover flex-shrink-0"
                                />
                              )}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <p className="text-sm font-medium line-clamp-2 leading-snug text-primary">
                          {article.title}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

          {/* RIGHT: Article detail with crossfade */}
          <div className="lg:col-span-8 bg-surface rounded-2xl border border-border-default overflow-hidden">
            <div
              className="transition-opacity duration-200 ease-in-out"
              style={{ opacity: isTransitioning ? 0 : 1 }}
            >
              <ArticleDetail article={displayedItem} countryCodeMap={countryCodeMap} onShopSelect={onShopSelect} />
            </div>
          </div>
        </div>
    </div>
  );
}

function ArticleDetail({ article, countryCodeMap, onShopSelect }: { article: NewsArticle; countryCodeMap: Map<string, string>; onShopSelect?: (shop: Shop) => void }) {
  const imageUrl = getMediaUrl(article.featured_image);
  const sourceLogoUrl = getMediaUrl(article.source?.logo);
  const cityInfo = getCityInfo(article);
  const countryCode = cityInfo?.countryName
    ? countryCodeMap.get(cityInfo.countryName.toLowerCase()) || null
    : null;

  return (
    <div>
      {/* Featured image */}
      {imageUrl && (
        <div className="relative w-full aspect-[16/9] overflow-hidden bg-gray-100 dark:bg-white/5">
          <Image
            src={imageUrl}
            alt={article.title}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 58vw"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-6 md:p-8 space-y-5">
        {/* Source attribution */}
        <div className="flex items-center gap-3">
          {sourceLogoUrl ? (
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-white/10">
              <Image
                src={sourceLogoUrl}
                alt={article.source?.name || article.source_name}
                width={40}
                height={40}
                className="object-cover w-full h-full"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-base font-medium bg-gray-200 text-gray-600 dark:bg-white/20 dark:text-white flex-shrink-0">
              {(article.source?.name || article.source_name).charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-primary">
              {article.source?.name || article.source_name}
            </p>
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <span>{formatDate(article.published_date)}</span>
              {article.source_author && (
                <>
                  <span>·</span>
                  <span>{article.source_author}</span>
                </>
              )}
              {cityInfo && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    {cityInfo.city}
                    {countryCode && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getFlagUrl(countryCode)}
                        alt={cityInfo.countryName || ''}
                        className="w-3.5 h-3.5 rounded-full object-cover"
                      />
                    )}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-display text-2xl md:text-3xl text-primary leading-tight">
          {article.title}
        </h3>

        {/* Statement */}
        {article.statement && (
          <p className="text-base text-text-secondary italic leading-relaxed">
            {article.statement}
          </p>
        )}

        {/* Full summary */}
        {article.summary && (
          <p className="text-sm text-primary leading-relaxed whitespace-pre-wrap">
            {article.summary}
          </p>
        )}

        {/* Read full article link */}
        <a
          href={article.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
        >
          Read full article
          <ArrowUpRight className="w-4 h-4" />
        </a>

        {/* Shops mentioned */}
        {article.shops_mentioned && article.shops_mentioned.length > 0 && (
          <div className="border-t border-border-default pt-4">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
              Shops mentioned
            </p>
            <div className="divide-y divide-border-default -mx-2">
              {article.shops_mentioned.map((shop) => (
                <ShopListItem
                  key={shop.documentId}
                  shop={shop}
                  onClick={() => onShopSelect?.(shop)}
                  subtitle={shop.city_area?.name || shop.location?.name}
                  showImage={false}
                  showDescription={false}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
