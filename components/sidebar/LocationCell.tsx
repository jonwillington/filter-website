'use client';

import { memo } from 'react';
import Image from 'next/image';
import { ChevronRight, MapPin } from 'lucide-react';
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
      className="w-full flex items-center gap-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg px-4 py-3 cursor-pointer transition-colors min-h-[48px] text-left"
      aria-label={locationName ? `${locationName}. Click to change location.` : 'Select location'}
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
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <MapPin className="w-4 h-4 text-text-secondary flex-shrink-0" />
        <p className="text-base font-medium text-primary truncate">
          {locationName || 'Select location'}
        </p>
      </div>

      {/* Chevron */}
      <ChevronRight className="w-4 h-4 text-text-secondary flex-shrink-0" />
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
