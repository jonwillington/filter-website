import { Shop } from '@/lib/types';
import { ShopMiniCard } from '../shared';

interface RelatedShopsProps {
  title: string;
  shops: Shop[];
  onShopSelect: (shop: Shop) => void;
}

export function RelatedShops({ title, shops, onShopSelect }: RelatedShopsProps) {
  if (shops.length === 0) return null;

  return (
    <div>
      <h3 className="text-lg font-semibold text-primary mb-3">
        {title}
      </h3>
      <div className="space-y-2">
        {shops.slice(0, 5).map((shop) => (
          <ShopMiniCard
            key={shop.documentId}
            shop={shop}
            onClick={() => onShopSelect(shop)}
          />
        ))}
      </div>
    </div>
  );
}
