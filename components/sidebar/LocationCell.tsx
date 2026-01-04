'use client';

import Image from 'next/image';
import { ChevronRight } from 'lucide-react';
import { Location } from '@/lib/types';

interface LocationCellProps {
  selectedLocation: Location | null;
  unsupportedCountry: { name: string; code: string } | null;
  isAreaUnsupported: boolean;
  onClick: () => void;
}

const getFlagUrl = (countryCode: string): string =>
  `https://hatscripts.github.io/circle-flags/flags/${countryCode.toLowerCase()}.svg`;

export function LocationCell({
  selectedLocation,
  unsupportedCountry,
  isAreaUnsupported,
  onClick,
}: LocationCellProps) {
  // Determine what to display
  const showFlag = selectedLocation?.country?.code || (isAreaUnsupported && unsupportedCountry?.code);
  const flagCode = isAreaUnsupported && unsupportedCountry?.code
    ? unsupportedCountry.code
    : selectedLocation?.country?.code;
  const locationName = isAreaUnsupported && unsupportedCountry?.name
    ? unsupportedCountry.name
    : selectedLocation?.name;
  const showCaption = selectedLocation || (isAreaUnsupported && unsupportedCountry);

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 bg-surface hover:bg-border-default rounded-lg px-4 py-3 cursor-pointer transition-colors min-h-[48px] text-left"
      aria-label={locationName ? `Exploring in ${locationName}. Click to change location.` : 'Select location'}
    >
      {/* Flag */}
      {showFlag && flagCode && (
        <span className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
          <Image
            src={getFlagUrl(flagCode)}
            alt=""
            width={24}
            height={24}
            className="object-cover w-full h-full"
            unoptimized
          />
        </span>
      )}

      {/* Text content */}
      <div className="flex-1 min-w-0">
        {showCaption && (
          <p className="text-xs text-text-secondary leading-tight">Exploring in</p>
        )}
        <p className="text-base font-medium text-primary truncate">
          {locationName || 'Select location'}
        </p>
      </div>

      {/* Chevron */}
      <ChevronRight className="w-4 h-4 text-text-secondary flex-shrink-0" />
    </button>
  );
}
