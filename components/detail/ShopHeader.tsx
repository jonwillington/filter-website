import { Shop } from '@/lib/types';
import { Avatar } from '@heroui/react';
import { getMediaUrl, getShopDisplayName } from '@/lib/utils';

interface ShopHeaderProps {
  shop: Shop;
}

export function ShopHeader({ shop }: ShopHeaderProps) {
  const logoUrl = getMediaUrl(shop.brand?.logo);
  const displayName = getShopDisplayName(shop);

  return (
    <div className="flex items-start gap-4">
      <Avatar
        src={logoUrl || undefined}
        name={shop.brand?.name ?? shop.name}
        size="lg"
        className="flex-shrink-0 w-16 h-16"
        showFallback
        fallback={<span className="text-2xl">☕</span>}
      />
      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-bold text-contrastBlock leading-tight">
          {displayName}
        </h1>
        <p className="text-sm text-textSecondary mt-1">
          {shop.city_area?.name ?? shop.cityArea?.name}
          {shop.location?.name && `, ${shop.location.name}`}
        </p>
      </div>
    </div>
  );
}
