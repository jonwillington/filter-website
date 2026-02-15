import { Shop } from '@/lib/types';
import { AmenityChip, PropertyRow } from '@/components/ui';
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
    <PropertyRow label="Amenities" showDivider>
      {activeAmenities.map(({ key, label }) => (
        <AmenityChip key={key}>
          {label}
        </AmenityChip>
      ))}
    </PropertyRow>
  );
}
