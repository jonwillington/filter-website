import { Shop } from '@/lib/types';
import { Chip } from '@heroui/react';
import { Wifi, UtensilsCrossed, Sun, Dog } from 'lucide-react';
import { getMergedAmenities } from '@/lib/utils';

interface AmenityListProps {
  shop: Shop;
}

const amenityConfig = [
  { key: 'has_wifi', label: 'WiFi', icon: Wifi },
  { key: 'has_food', label: 'Food', icon: UtensilsCrossed },
  { key: 'has_outdoor_space', label: 'Outdoor', icon: Sun },
  { key: 'is_pet_friendly', label: 'Pet Friendly', icon: Dog },
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
        {activeAmenities.map(({ key, label, icon: Icon }) => (
          <Chip
            key={key}
            variant="flat"
            size="sm"
            startContent={<Icon className="w-3.5 h-3.5" />}
            classNames={{
              base: 'bg-surface',
              content: 'text-text text-xs',
            }}
          >
            {label}
          </Chip>
        ))}
      </div>
    </div>
  );
}
