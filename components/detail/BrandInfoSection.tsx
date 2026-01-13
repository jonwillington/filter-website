'use client';

import { Shop } from '@/lib/types';
import { Divider } from '@heroui/react';
import { PropertyRow } from '@/components/ui';

interface BrandInfoSectionProps {
  shop: Shop;
}

const EQUIPMENT_CATEGORIES = [
  { key: 'grinders' as const, label: 'Grinders' },
  { key: 'espresso' as const, label: 'Espresso' },
  { key: 'drippers' as const, label: 'Drippers' },
  { key: 'roasters' as const, label: 'Roasters' },
];

export function BrandInfoSection({ shop }: BrandInfoSectionProps) {
  const brand = shop?.brand;
  if (!brand) return null;

  const equipment = brand?.equipment;
  const awards = brand?.awards;
  const founder = brand?.founder;

  // Check if equipment has any items
  const hasEquipment = equipment && (
    (equipment.grinders?.length ?? 0) > 0 ||
    (equipment.espresso?.length ?? 0) > 0 ||
    (equipment.drippers?.length ?? 0) > 0 ||
    (equipment.roasters?.length ?? 0) > 0
  );

  const hasAwards = awards && awards.length > 0;

  // Don't render if no brand info to show
  if (!hasEquipment && !hasAwards && !founder) return null;

  // Get equipment categories that have items
  const equipmentItems = hasEquipment
    ? EQUIPMENT_CATEGORIES.filter(cat => (equipment[cat.key]?.length ?? 0) > 0)
    : [];

  // Get sorted awards (most recent 2)
  const sortedAwards = hasAwards
    ? awards
        .sort((a, b) => parseInt(b.year, 10) - parseInt(a.year, 10))
        .slice(0, 2)
    : [];

  return (
    <>
      <Divider className="my-5 opacity-30" />

      {founder && (
        <div className="text-xs text-text-secondary mb-3">
          Founder: {founder}
        </div>
      )}

      {hasEquipment && (
        <div>
          <h3 className="text-sm font-semibold text-primary mb-1">
            Equipment
          </h3>
          <div>
            {equipmentItems.map(cat => (
              <PropertyRow
                key={cat.key}
                label={cat.label}
                value={equipment[cat.key]!.join(', ')}
              />
            ))}
          </div>
        </div>
      )}

      {hasEquipment && hasAwards && (
        <Divider className="my-5 opacity-30" />
      )}

      {hasAwards && (
        <div>
          <h3 className="text-sm font-semibold text-primary mb-1">
            Awards
          </h3>
          <div>
            {sortedAwards.map((award, idx) => (
              <PropertyRow
                key={idx}
                label={award.year}
                value={award.award}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
