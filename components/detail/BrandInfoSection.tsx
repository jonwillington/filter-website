'use client';

import { Shop } from '@/lib/types';
import { Divider } from '@heroui/react';

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

  // Build equipment text
  const equipmentText = hasEquipment ? EQUIPMENT_CATEGORIES
    .filter(cat => ((equipment[cat.key]?.length ?? 0) > 0))
    .map(cat => `${cat.label}: ${equipment[cat.key]?.join(', ')}`)
    .join(' • ') : '';

  // Build awards text (show most recent 2)
  const awardsText = hasAwards
    ? awards
      .sort((a, b) => parseInt(b.year, 10) - parseInt(a.year, 10))
      .slice(0, 2)
      .map((award) => `${award.year} ${award.award}`)
      .join(' • ')
    : '';

  return (
    <>
      <Divider className="my-5 opacity-30" />

      {founder && (
        <div className="text-xs text-textSecondary mb-3">
          Founder: {founder}
        </div>
      )}

      {hasEquipment && (
        <div>
          <h3 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-2">
            Equipment
          </h3>
          <p className="text-sm text-text leading-snug">
            {equipmentText}
          </p>
        </div>
      )}

      {hasEquipment && hasAwards && (
        <Divider className="my-5 opacity-30" />
      )}

      {hasAwards && (
        <div>
          <h3 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-2">
            Awards
          </h3>
          <p className="text-sm text-text leading-snug">
            {awardsText}
          </p>
        </div>
      )}
    </>
  );
}
