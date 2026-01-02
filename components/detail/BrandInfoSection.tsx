'use client';

import { Shop } from '@/lib/types';
import { Coffee, Award, Wrench } from 'lucide-react';

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
  const founded = brand?.founded;
  const founder = brand?.founder;

  // Check if equipment has any items
  const hasEquipment = equipment && (
    (equipment.grinders?.length ?? 0) > 0 ||
    (equipment.espresso?.length ?? 0) > 0 ||
    (equipment.drippers?.length ?? 0) > 0 ||
    (equipment.roasters?.length ?? 0) > 0
  );

  const hasAwards = awards && awards.length > 0;
  const hasMeta = founded || founder;

  // Don't render if no brand info to show
  if (!hasEquipment && !hasAwards && !hasMeta) return null;

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

  // Build meta text
  const metaParts: string[] = [];
  if (founded) metaParts.push(`Founded: ${founded}`);
  if (founder) metaParts.push(`Founder: ${founder}`);
  const metaText = metaParts.join(' • ');

  return (
    <div className="space-y-3">
      {hasMeta && (
        <div className="text-xs text-textSecondary">
          {metaText}
        </div>
      )}

      {hasEquipment && (
        <div className="bg-surface rounded-xl p-4 flex gap-3">
          <div className="w-10 h-10 bg-chipBackground rounded-lg flex items-center justify-center flex-shrink-0">
            <Wrench className="w-5 h-5 text-text" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-text mb-1">Equipment</h4>
            <p className="text-xs text-textSecondary leading-relaxed">
              {equipmentText}
            </p>
          </div>
        </div>
      )}

      {hasAwards && (
        <div className="bg-surface rounded-xl p-4 flex gap-3">
          <div className="w-10 h-10 bg-chipBackground rounded-lg flex items-center justify-center flex-shrink-0">
            <Award className="w-5 h-5 text-text" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-text mb-1">Awards</h4>
            <p className="text-xs text-textSecondary leading-relaxed">
              {awardsText}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
