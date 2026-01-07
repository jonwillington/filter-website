'use client';

import { Shop } from '@/lib/types';

interface ShopPropertiesProps {
  shop: Shop;
}

interface PropertyRowProps {
  label: string;
  value: string;
}

function PropertyRow({ label, value }: PropertyRowProps) {
  return (
    <div className="flex justify-between items-baseline py-2.5 border-b border-border-default last:border-b-0">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="text-sm text-primary font-medium text-right">{value}</span>
    </div>
  );
}

export function ShopProperties({ shop }: ShopPropertiesProps) {
  const hasArchitects = !!shop.architects;
  const hasPrice = !!shop.price;

  if (!hasArchitects && !hasPrice) return null;

  return (
    <div className="mt-5 bg-surface rounded-xl border border-border-default p-4">
      {hasArchitects && (
        <PropertyRow label="Architects" value={shop.architects!} />
      )}
      {hasPrice && (
        <PropertyRow label="Price" value={shop.price!} />
      )}
    </div>
  );
}
