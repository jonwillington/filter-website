'use client';

import { Shop } from '@/lib/types';
import { ShopHeader } from './ShopHeader';
import { ShopInfo } from './ShopInfo';
import { AmenityList } from './AmenityList';
import { PhotoGallery } from './PhotoGallery';
import { SocialLinks } from './SocialLinks';
import { Button } from '@heroui/react';
import { X } from 'lucide-react';

interface ShopDrawerProps {
  shop: Shop;
  onClose: () => void;
}

export function ShopDrawer({ shop, onClose }: ShopDrawerProps) {
  return (
    <div className="shop-drawer">
      <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 p-4 border-b border-border flex justify-between items-center">
        <h2 className="text-lg font-semibold text-contrastBlock">Details</h2>
        <Button
          isIconOnly
          variant="light"
          size="sm"
          onPress={onClose}
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="p-5 space-y-6">
        <ShopHeader shop={shop} />
        <ShopInfo shop={shop} />
        <AmenityList shop={shop} />
        <PhotoGallery shop={shop} />
        <SocialLinks shop={shop} />
      </div>
    </div>
  );
}
