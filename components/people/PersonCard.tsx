'use client';

import Image from 'next/image';
import { Person } from '@/lib/types';
import { getMediaUrl } from '@/lib/utils';

interface PersonCardProps {
  person: Person;
  onClick: () => void;
  variant?: 'default' | 'light';
}

export function PersonCard({ person, onClick, variant = 'default' }: PersonCardProps) {
  const isLight = variant === 'light';
  const photoUrl = getMediaUrl(person.photo);
  const picksCount = person.person_picks?.length ?? 0;

  // Truncate bio for preview
  const bioPreview = person.bio
    ? person.bio.length > 100
      ? person.bio.slice(0, 100).trim() + '...'
      : person.bio
    : null;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left transition-all duration-200 py-3 px-4 group ${
        isLight ? 'hover:bg-white/5' : 'hover:bg-gray-50 dark:hover:bg-white/5'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Photo */}
        {photoUrl ? (
          <div className={`w-12 h-12 rounded-full overflow-hidden flex-shrink-0 ${
            isLight ? 'bg-white/10' : 'bg-gray-100 dark:bg-white/10'
          }`}>
            <Image
              src={photoUrl}
              alt={person.name}
              width={48}
              height={48}
              className="object-cover w-full h-full"
            />
          </div>
        ) : (
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-medium flex-shrink-0 ${
              isLight ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600 dark:bg-white/20 dark:text-white'
            }`}
          >
            {person.name.charAt(0)}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Name */}
          <h4 className={`font-medium text-[15px] leading-tight ${
            isLight ? 'text-white' : 'text-primary'
          }`}>
            {person.name}
          </h4>

          {/* Bio preview or picks count */}
          {bioPreview ? (
            <p className={`text-sm line-clamp-2 mt-0.5 ${
              isLight ? 'text-white/60' : 'text-text-secondary'
            }`}>
              {bioPreview}
            </p>
          ) : picksCount > 0 ? (
            <p className={`text-sm mt-0.5 ${
              isLight ? 'text-white/60' : 'text-text-secondary'
            }`}>
              {picksCount} {picksCount === 1 ? 'pick' : 'picks'}
            </p>
          ) : null}
        </div>

        {/* Arrow indicator */}
        <svg
          className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:translate-x-0.5 ${
            isLight ? 'text-white/40' : 'text-gray-400 dark:text-white/40'
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}
