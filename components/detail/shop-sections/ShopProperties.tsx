'use client';

import { Shop } from '@/lib/types';
import { PropertyRow } from '@/components/ui';

interface ShopPropertiesProps {
  shop: Shop;
}

export function ShopProperties({ shop }: ShopPropertiesProps) {
  const hasArchitects = !!shop.architects;
  const hasPrice = !!shop.price;

  if (!hasArchitects && !hasPrice) return null;

  return (
    <div className="mt-4">
      {hasArchitects && (
        <PropertyRow label="Architects" value={shop.architects!} />
      )}
      {hasPrice && (
        <PropertyRow label="Price" value={shop.price!} />
      )}
    </div>
  );
}
