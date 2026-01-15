import { memo } from 'react';
import { Shop } from '@/lib/types';
import { getMediaUrl, getShopDisplayName } from '@/lib/utils';

interface ShopMiniCardProps {
  shop: Shop;
  onClick: () => void;
}

function ShopMiniCardComponent({ shop, onClick }: ShopMiniCardProps) {
  const imageUrl = getMediaUrl(shop.featured_image);
  const displayName = getShopDisplayName(shop);

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-3 hover:bg-surface transition-colors w-full text-left"
    >
      {/* Shop Image */}
      <div className="relative flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden bg-gray-100 dark:bg-white/10">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-xs text-text-secondary">No image</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <p className="text-sm font-medium text-text truncate">{displayName}</p>
        {shop.address && (
          <p className="text-xs text-textSecondary truncate mt-0.5">{shop.address}</p>
        )}
      </div>
    </button>
  );
}

// Memoize to prevent unnecessary re-renders in shop lists
export const ShopMiniCard = memo(ShopMiniCardComponent, (prevProps, nextProps) => {
  return prevProps.shop.documentId === nextProps.shop.documentId;
});
