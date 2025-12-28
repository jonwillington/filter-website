import { Shop } from '@/lib/types';
import { Chip } from '@heroui/react';
import { Wifi, Coffee, Sun, UtensilsCrossed } from 'lucide-react';

interface AmenityListProps {
  shop: Shop;
}

const amenities = [
  { key: 'has_wifi', label: 'WiFi', icon: Wifi },
  { key: 'has_v60', label: 'V60', icon: Coffee },
  { key: 'has_chemex', label: 'Chemex', icon: Coffee },
  { key: 'has_filter_coffee', label: 'Filter', icon: Coffee },
  { key: 'has_slow_bar', label: 'Slow Bar', icon: Coffee },
  { key: 'has_kitchen', label: 'Food', icon: UtensilsCrossed },
  { key: 'has_outdoor_space', label: 'Outdoor', icon: Sun },
] as const;

export function AmenityList({ shop }: AmenityListProps) {
  const activeAmenities = amenities.filter(
    (a) => shop[a.key as keyof Shop] === true
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
