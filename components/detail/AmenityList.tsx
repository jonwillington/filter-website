import { Shop } from '@/lib/types';
import { AmenityChip } from '@/components/ui';
import { getMergedAmenities } from '@/lib/utils';

interface AmenityListProps {
  shop: Shop;
}

const amenityConfig = [
  { key: 'has_wifi', label: 'WiFi' },
  { key: 'has_food', label: 'Food' },
  { key: 'has_outdoor_space', label: 'Outdoor' },
  { key: 'is_pet_friendly', label: 'Pet Friendly' },
] as const;

export function AmenityList({ shop }: AmenityListProps) {
  const amenities = getMergedAmenities(shop);

  const activeAmenities = amenityConfig.filter(
    (a) => amenities[a.key as keyof typeof amenities]
  );

  if (activeAmenities.length === 0) return null;

  return (
    <div>
      <h3 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-3">
        Amenities
      </h3>
      <div className="flex flex-wrap gap-2">
        {activeAmenities.map(({ key, label }) => (
          <AmenityChip key={key}>
            {label}
          </AmenityChip>
        ))}
      </div>
    </div>
  );
}
