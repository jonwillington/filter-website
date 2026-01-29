import { memo } from 'react';
import { Shop } from '@/lib/types';
import { getMediaUrl } from '@/lib/utils';

interface ShopMiniCardProps {
  shop: Shop;
  onClick: () => void;
}

function ShopMiniCardComponent({ shop, onClick }: ShopMiniCardProps) {
  const imageUrl = getMediaUrl(shop.featured_image);
  // Just show prefName or name - brand is already shown in the modal header
  const displayName = shop.prefName || shop.name;

  return (
    <button
      onClick={onClick}
      className="flex items-start gap-4 py-4 px-3 hover:bg-surface transition-colors w-full text-left"
    >
      {/* Shop Image - wider */}
      <div className="relative flex-shrink-0 w-32 h-24 rounded-lg overflow-hidden bg-surface">
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
      <div className="flex-1 min-w-0 flex flex-col py-1">
        {/* Name */}
        <p className="text-base font-medium text-primary truncate">{displayName}</p>
        {/* Description */}
        {shop.description && (
          <p className="text-sm text-text-secondary line-clamp-2 mt-1">{shop.description}</p>
        )}
        {/* Address - caption at bottom with larger gap */}
        {shop.address && (
          <p className="text-xs text-text-secondary truncate mt-auto pt-3">{shop.address}</p>
        )}
      </div>
    </button>
  );
}

// Memoize to prevent unnecessary re-renders in shop lists
export const ShopMiniCard = memo(ShopMiniCardComponent, (prevProps, nextProps) => {
  return prevProps.shop.documentId === nextProps.shop.documentId;
});
