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

  // Get equipment categories that have specified items (filter out empty/unspecified)
  const equipmentItems = equipment
    ? EQUIPMENT_CATEGORIES
        .filter(cat => (equipment[cat.key]?.length ?? 0) > 0)
        .filter(cat => equipment[cat.key]!.some(item => item && item.trim() !== ''))
    : [];

  // Get sorted awards that have a year (most recent 2)
  const sortedAwards = awards
    ? awards
        .filter(award => award.year && String(award.year).trim() !== '')
        .sort((a, b) => Number(b.year) - Number(a.year))
        .slice(0, 2)
    : [];

  // Don't render if no brand info to show
  if (equipmentItems.length === 0 && sortedAwards.length === 0 && !founder) return null;

  return (
    <>
      <Divider className="my-5 opacity-30" />

      {founder && (
        <div className="text-xs text-text-secondary mb-3">
          Founder: {founder}
        </div>
      )}

      {equipmentItems.length > 0 && equipment && (
        <div>
          <h3 className="text-lg font-medium text-primary mb-1">
            Equipment
          </h3>
          <div>
            {equipmentItems.map((cat, idx) => (
              <PropertyRow
                key={cat.key}
                label={cat.label}
                value={(equipment[cat.key] ?? []).filter(item => item && item.trim() !== '').join(', ')}
                showDivider={idx > 0}
              />
            ))}
          </div>
        </div>
      )}

      {equipmentItems.length > 0 && sortedAwards.length > 0 && (
        <Divider className="my-5 opacity-30" />
      )}

      {sortedAwards.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-primary mb-1">
            Awards
          </h3>
          <div>
            {sortedAwards.map((award, idx) => (
              <PropertyRow
                key={idx}
                label={award.year}
                value={award.award}
                showDivider={idx > 0}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
