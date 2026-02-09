'use client';

import { useRef, useEffect } from 'react';
import Image from 'next/image';
import { ModalBody } from '@heroui/react';
import { NewsArticle, Shop } from '@/lib/types';
import { ResponsiveModal } from '@/components/ui/ResponsiveModal';
import { StickyDrawerHeader } from '@/components/ui';
import { ShopListItem } from '@/components/shop';
import { getMediaUrl } from '@/lib/utils';
import { useStickyHeaderOpacity } from '@/lib/hooks';
import { ArrowUpRight, Calendar, User, Store } from 'lucide-react';

interface NewsArticleModalProps {
  article: NewsArticle | null;
  isOpen: boolean;
  onClose: () => void;
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

export function NewsArticleModal({ article, isOpen, onClose, onShopSelect }: NewsArticleModalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { opacity: stickyHeaderOpacity, resetOpacity } = useStickyHeaderOpacity(scrollRef);

  useEffect(() => {
    if (article) {
      resetOpacity();
    }
  }, [article?.documentId, resetOpacity]);

  if (!article) return null;

  const imageUrl = getMediaUrl(article.featured_image);
  const typeLabel = article.news_type ? NEWS_TYPE_LABELS[article.news_type] || 'News' : null;
  const sourceLogoUrl = getMediaUrl(article.source?.logo);
  const shops = article.shops_mentioned ?? [];
  const hasShops = shops.length > 0;

  const handleShopClick = (shop: Shop) => {
    if (onShopSelect) {
      onClose();
      onShopSelect(shop);
    }
  };

  const shopsList = (showImage: boolean) =>
    shops.map((shop) => (
      <ShopListItem
        key={shop.documentId}
        shop={shop}
        onClick={() => handleShopClick(shop)}
        subtitle={shop.location?.name}
        showImage={showImage}
      />
    ));

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      size={hasShops ? '4xl' : 'lg'}
      modalClassNames={{
        base: 'bg-background',
      }}
    >
      <ModalBody className="p-0 overflow-hidden flex flex-col">
        <div className={`flex-1 flex flex-col ${hasShops ? 'lg:flex-row' : ''} overflow-hidden`}>
          {/* Article column */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto min-w-0">
            <StickyDrawerHeader
              title={article.title}
              opacity={stickyHeaderOpacity}
              onClose={onClose}
            />

            {/* Hero image */}
            {imageUrl && (
              <div className="relative w-full aspect-[16/9] overflow-hidden bg-gray-100 dark:bg-white/5">
                <Image
                  src={imageUrl}
                  alt={article.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            {/* Content */}
            <div className="p-6 space-y-5">
              {/* Source attribution with logo */}
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
                  <p className="text-sm font-medium text-primary">{article.source?.name || article.source_name}</p>
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(article.published_date)}
                    </span>
                    {article.source_author && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {article.source_author}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                {typeLabel && (
                  <span className="px-2.5 py-1 rounded-full bg-accent/10 text-accent font-medium">
                    {typeLabel}
                  </span>
                )}
                {article.importance === 'breaking' && (
                  <span className="px-2.5 py-1 rounded-full bg-error/10 text-error font-medium">
                    Breaking
                  </span>
                )}
              </div>

              {/* Title */}
              <h2
                className="text-primary"
                style={{
                  fontFamily: 'PPNeueYork, serif',
                  fontSize: '26px',
                  fontWeight: 600,
                  letterSpacing: '-0.5px',
                  lineHeight: 1.2,
                }}
              >
                {article.title}
              </h2>

              {/* Statement (hook line) */}
              {article.statement && (
                <p className="text-base text-text-secondary italic leading-relaxed">
                  {article.statement}
                </p>
              )}

              {/* Summary */}
              {article.summary && (
                <p className="text-sm text-primary leading-relaxed whitespace-pre-wrap">
                  {article.summary}
                </p>
              )}

              {/* Read article button */}
              <a
                href={article.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-contrastBlock text-contrastText font-medium text-sm hover:opacity-90 transition-opacity"
              >
                Read full article
                <ArrowUpRight className="w-4 h-4" />
              </a>

              {/* Mentioned shops - mobile only (inline at bottom) */}
              {hasShops && (
                <div className="lg:hidden">
                  <div className="border-t border-border-default pt-5">
                    <h3 className="text-sm font-medium text-primary mb-3">
                      {shops.length} {shops.length === 1 ? 'shop' : 'shops'} mentioned
                    </h3>
                    <div className="space-y-1">
                      {shopsList(true)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Shops sidebar - desktop only */}
          {hasShops && (
            <div className="hidden lg:flex flex-col w-[280px] flex-shrink-0 border-l border-border-default">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-border-default flex-shrink-0">
                <Store className="w-4 h-4 text-text-secondary" />
                <h3 className="text-sm font-medium text-primary">
                  {shops.length} {shops.length === 1 ? 'shop' : 'shops'} mentioned
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto px-2 py-2">
                <div className="space-y-0.5">
                  {shopsList(false)}
                </div>
              </div>
            </div>
          )}
        </div>
      </ModalBody>
    </ResponsiveModal>
  );
}
