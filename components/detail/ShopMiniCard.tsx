import { Shop, OpeningHours } from '@/lib/types';
import { Avatar } from '@heroui/react';
import { StatusChip } from '@/components/ui';
import { getMediaUrl, getShopDisplayName } from '@/lib/utils';

interface ShopMiniCardProps {
  shop: Shop;
  onClick: () => void;
}

function isOpeningHoursObject(hours: unknown): hours is OpeningHours {
  return typeof hours === 'object' && hours !== null && !Array.isArray(hours);
}

export function ShopMiniCard({ shop, onClick }: ShopMiniCardProps) {
  const logoUrl = getMediaUrl(shop.brand?.logo);
  const imageUrl = getMediaUrl(shop.featured_image);
  const displayName = getShopDisplayName(shop);

  const openingHours = isOpeningHoursObject(shop.opening_hours) ? shop.opening_hours : null;
  const isOpen = shop.is_open ?? openingHours?.open_now;

  return (
    <button
      onClick={onClick}
      className="flex gap-3 p-3 bg-surface rounded-lg hover:bg-surface/80 transition-colors w-full text-left"
    >
      {/* Image or Logo */}
      <div className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-border">
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt={displayName}
              className="w-full h-full object-cover"
            />
            {logoUrl && (
              <Avatar
                src={logoUrl}
                name={shop.brand?.name ?? shop.name}
                size="sm"
                className="absolute bottom-1 left-1 w-6 h-6 ring-1 ring-white"
                showFallback
                fallback={<span />}
              />
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Avatar
              src={logoUrl || undefined}
              name={shop.brand?.name ?? shop.name}
              size="md"
              showFallback
              fallback={<span />}
            />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text truncate">{displayName}</p>
        {shop.address && (
          <p className="text-xs text-textSecondary truncate mt-0.5">{shop.address}</p>
        )}
        {isOpen !== undefined && (
          <StatusChip
            status={isOpen ? 'success' : 'danger'}
            className="mt-1.5"
          >
            {isOpen ? 'Open' : 'Closed'}
          </StatusChip>
        )}
      </div>
    </button>
  );
}
