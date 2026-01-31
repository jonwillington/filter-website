'use client';

import { memo } from 'react';
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
  `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;

function LocationCellComponent({
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

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 py-2 cursor-pointer transition-colors text-left group"
      aria-label={locationName ? `${locationName}. Click to change location.` : 'Select location'}
    >
      {/* Flag */}
      {showFlag && flagCode && (
        <span className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
          <Image
            src={getFlagUrl(flagCode)}
            alt=""
            width={32}
            height={32}
            className="object-cover w-full h-full"
            unoptimized
          />
        </span>
      )}

      {/* Text content */}
      <div className="flex-1 min-w-0">
        <p className="text-[1.5rem] font-medium text-primary truncate leading-tight group-hover:text-amber-900 dark:group-hover:text-amber-700 transition-colors">
          {locationName || 'Select location'}
        </p>
      </div>

      {/* Chevron */}
      <ChevronRight className="w-5 h-5 text-text-secondary flex-shrink-0" />
    </button>
  );
}

// Memoize to prevent unnecessary re-renders
export const LocationCell = memo(LocationCellComponent, (prevProps, nextProps) => {
  return (
    prevProps.selectedLocation?.documentId === nextProps.selectedLocation?.documentId &&
    prevProps.unsupportedCountry?.code === nextProps.unsupportedCountry?.code &&
    prevProps.isAreaUnsupported === nextProps.isAreaUnsupported
  );
});
