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
      <div className="sticky top-0 z-10 bg-background border-b border-border-default">
        <div className="px-6 py-6 flex items-center gap-4">
          {brandLogo ? (
            <img
              src={brandLogo}
              alt={brandName}
              className="w-14 h-14 rounded-xl object-cover"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-surface flex items-center justify-center">
              <span className="text-lg font-semibold text-text-secondary">
                {brandName.charAt(0)}
              </span>
            </div>
          )}
          <div>
            <h2 className="text-2xl font-display font-semibold text-primary">
              {brandName}
            </h2>
            <p className="text-sm text-text-secondary mt-0.5">
              {shops.length} {shops.length === 1 ? 'location' : 'locations'}
            </p>
          </div>
        </div>
      </div>

      <ModalBody className="p-0">
        <ScrollShadow className="max-h-[70vh]">
          <div className="divide-y divide-border-default">
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
