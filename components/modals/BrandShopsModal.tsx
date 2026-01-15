'use client';

import { ModalBody, ScrollShadow } from '@heroui/react';
import { Shop } from '@/lib/types';
import { ResponsiveModal } from '@/components/ui';
import { ShopMiniCard } from '@/components/detail';

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
      <div className="sticky top-0 z-10 bg-background border-b border-gray-200 dark:border-white/10">
        <div className="px-6 py-5 flex items-center gap-3">
          {brandLogo ? (
            <img
              src={brandLogo}
              alt={brandName}
              className="w-10 h-10 rounded-lg object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center">
              <span className="text-sm font-medium text-text-secondary">
                {brandName.charAt(0)}
              </span>
            </div>
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
          <div className="divide-y divide-gray-200 dark:divide-white/10">
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
