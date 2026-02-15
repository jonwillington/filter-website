'use client';

import { useState, useMemo } from 'react';
import { Shop, CitedSource } from '@/lib/types';
import { ChevronDown, ExternalLink } from 'lucide-react';

interface SourcesSectionProps {
  shop: Shop;
}

/**
 * Get favicon URL for a website using Google's favicon service
 */
function getFaviconUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Use Google's favicon service which handles caching and fallbacks
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
  } catch {
    return '';
  }
}

/**
 * Get display hostname from URL
 */
function getHostname(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

export function SourcesSection({ shop }: SourcesSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Combine and deduplicate sources from shop, brand, and brand's beans
  const allSources = useMemo(() => {
    const sourcesMap = new Map<string, CitedSource>();

    // Add shop sources
    if (shop.citedSources) {
      shop.citedSources.forEach((source) => {
        if (source.url && !sourcesMap.has(source.url)) {
          sourcesMap.set(source.url, source);
        }
      });
    }

    // Add brand sources
    if (shop.brand?.citedSources) {
      shop.brand.citedSources.forEach((source) => {
        if (source.url && !sourcesMap.has(source.url)) {
          sourcesMap.set(source.url, source);
        }
      });
    }

    // Add bean sources (from brand's beans)
    if (shop.brand?.beans) {
      shop.brand.beans.forEach((bean) => {
        if ((bean as any).citedSources) {
          ((bean as any).citedSources as CitedSource[]).forEach((source) => {
            if (source.url && !sourcesMap.has(source.url)) {
              sourcesMap.set(source.url, source);
            }
          });
        }
      });
    }

    return Array.from(sourcesMap.values());
  }, [shop]);

  if (allSources.length === 0) {
    return null;
  }

  return (
    <div>
      <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between py-2 text-left group"
        >
          <span className="text-sm font-medium text-text-secondary">
            Learn more ({allSources.length})
          </span>
          <ChevronDown
            className={`w-4 h-4 text-text-secondary transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isExpanded && (
          <div className="mt-2 space-y-2">
            {allSources.map((source, index) => (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 py-2 px-3 -mx-3 rounded-lg hover:bg-surface transition-colors group"
              >
                {/* Favicon */}
                <img
                  src={getFaviconUrl(source.url)}
                  alt=""
                  className="w-4 h-4 flex-shrink-0"
                  onError={(e) => {
                    // Hide broken favicon images
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />

                {/* Title and hostname */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-primary truncate group-hover:text-accent transition-colors">
                    {source.title}
                  </p>
                  <p className="text-xs text-text-secondary truncate">
                    {source.publisher || getHostname(source.url)}
                  </p>
                </div>

                {/* External link icon */}
                <ExternalLink className="w-3.5 h-3.5 text-text-secondary/50 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ))}
          </div>
        )}
    </div>
  );
}
