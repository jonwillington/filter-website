'use client';

import Image from 'next/image';
import { NewsArticle } from '@/lib/types';
import { getMediaUrl } from '@/lib/utils';
import { getRelativeTimeLabel } from '@/lib/utils/dateUtils';

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

interface NewsCardProps {
  article: NewsArticle;
  onClick: () => void;
  primaryColor?: string;
}

export function NewsCard({ article, onClick, primaryColor }: NewsCardProps) {
  const typeLabel = article.news_type ? NEWS_TYPE_LABELS[article.news_type] || 'News' : null;
  const sourceLogoUrl = getMediaUrl(article.source?.logo);
  const sourceName = article.source?.name || article.source_name;

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl bg-black/[0.03] dark:bg-white/[0.04] p-3 group transition-colors hover:bg-black/[0.06] dark:hover:bg-white/[0.07]"
    >
      <div className="flex gap-3">
        {/* Source logo — dominant */}
        <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-white dark:bg-white/10">
          {sourceLogoUrl ? (
            <Image
              src={sourceLogoUrl}
              alt={sourceName}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-lg font-semibold text-text-secondary">
              {sourceName.charAt(0)}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Source + time + type */}
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <span className="font-medium truncate">{sourceName}</span>
            <span>·</span>
            <span className="flex-shrink-0">{getRelativeTimeLabel(article.published_date)}</span>
            {typeLabel && (
              <>
                <span className="flex-shrink-0">·</span>
                <span
                  className="inline-flex items-center px-1.5 py-px rounded-full text-[11px] font-medium text-white flex-shrink-0"
                  style={{ backgroundColor: primaryColor || '#8B6F47' }}
                >
                  {typeLabel}
                </span>
              </>
            )}
          </div>

          {/* Title */}
          <h4 className="font-medium text-[14px] leading-snug line-clamp-2 text-primary">
            {article.title}
          </h4>

          {/* Statement or summary preview */}
          {(article.statement || article.summary) && (
            <p className="text-xs text-text-secondary leading-relaxed line-clamp-1">
              {article.statement || article.summary}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
