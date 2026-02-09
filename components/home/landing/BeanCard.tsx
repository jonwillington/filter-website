'use client';

import { Bean } from '@/lib/types';
import { getMediaUrl } from '@/lib/utils';

interface BeanCardProps {
  bean: Bean;
}

export function BeanCard({ bean }: BeanCardProps) {
  const origins = bean.origins?.filter((o) => o.name && o.code) || [];
  const roastLabel = bean.roastLevel
    ? bean.roastLevel.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : null;
  const processLabel = bean.process
    ? bean.process.replace(/\b\w/g, (c) => c.toUpperCase())
    : null;
  const photoUrl = getMediaUrl(bean.photo);

  const meta = [
    bean.type === 'single-origin' ? 'Single Origin' : bean.type === 'blend' ? 'Blend' : null,
    roastLabel,
    processLabel,
  ].filter(Boolean).join(' \u00b7 ');

  const card = (
    <div className="flex gap-3 rounded-xl bg-background h-full overflow-hidden">
      {/* Square thumbnail */}
      {photoUrl ? (
        <div className="w-16 h-16 md:w-20 md:h-20 flex-shrink-0 rounded-lg overflow-hidden">
          <img src={photoUrl} alt={bean.name} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-16 h-16 md:w-20 md:h-20 flex-shrink-0 rounded-lg bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/30" />
      )}

      {/* Details */}
      <div className="py-1.5 pb-3 pr-2 flex-1 min-w-0 flex flex-col">
        <h4 className="font-medium text-primary text-sm line-clamp-1">
          {bean.name}
        </h4>

        {meta && (
          <p className="text-[11px] text-text-secondary mt-0.5 opacity-70">
            {meta}
          </p>
        )}

        {bean.shortDescription && (
          <p className="text-xs text-text-secondary mt-1 line-clamp-1 leading-relaxed">
            {bean.shortDescription}
          </p>
        )}

        {origins.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto pt-1">
            {origins.map((origin) => (
              <span
                key={origin.id}
                className="inline-flex items-center gap-1 text-[11px] text-text-secondary px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-white/10"
              >
                <img
                  src={`https://flagcdn.com/w40/${origin.code!.toLowerCase()}.png`}
                  alt={origin.name}
                  className="w-3 h-3 rounded-full"
                />
                {origin.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (bean.learnMoreUrl) {
    return (
      <a
        href={bean.learnMoreUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block h-full"
      >
        {card}
      </a>
    );
  }

  return card;
}
