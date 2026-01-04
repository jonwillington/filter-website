'use client';

import { ModalBody, ScrollShadow, Avatar } from '@heroui/react';
import { Shop } from '@/lib/types';
import { ResponsiveModal } from '@/components/ui';
import { ShopMiniCard } from '@/components/detail/ShopMiniCard';
import { getMediaUrl } from '@/lib/utils';

interface BrandShopsModalProps {
  isOpen: boolean;
  onClose: () => void;
  brandName: string;
  brandLogo?: string | null;
  shops: Shop[];
  onShopSelect: (shop: Shop) => void;
}

export function BrandShopsModal({
  isOpen,
  onClose,
  brandName,
  brandLogo,
  shops,
  onShopSelect,
}: BrandShopsModalProps) {
  const handleShopClick = (shop: Shop) => {
    onShopSelect(shop);
    onClose();
  };

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      modalClassNames={{
        backdrop: 'bg-black/60 backdrop-blur-sm',
        base: 'max-h-[90vh] bg-background',
      }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border-default">
        <div className="px-6 py-5 flex items-center gap-3">
          {brandLogo && (
            <Avatar
              src={brandLogo}
              name={brandName}
              size="md"
              radius="md"
              showFallback
              fallback={<span className="text-sm">☕</span>}
            />
          )}
          <div>
            <h2 className="text-lg font-display" style={{ color: 'var(--text)' }}>
              {brandName}
            </h2>
            <p className="text-sm text-textSecondary">
              {shops.length} {shops.length === 1 ? 'location' : 'locations'}
            </p>
          </div>
        </div>
      </div>

      <ModalBody className="p-0">
        <ScrollShadow className="max-h-[70vh]">
          <div className="px-5 py-4 space-y-2">
            {shops.map((shop) => (
              <ShopMiniCard
                key={shop.documentId}
                shop={shop}
                onClick={() => handleShopClick(shop)}
              />
            ))}
          </div>
        </ScrollShadow>
      </ModalBody>
    </ResponsiveModal>
  );
}
