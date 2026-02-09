'use client';

import { PersonPick } from '@/lib/types';
import { ShopListItem } from '@/components/shop';

interface PersonPickCardProps {
  pick: PersonPick;
  onClick: () => void;
}

export function PersonPickCard({ pick, onClick }: PersonPickCardProps) {
  const shop = pick.shop;
  if (!shop) return null;

  const neighborhoodName = shop.city_area?.name;
  const getShortAddress = (address: string) => address.split(',').map(p => p.trim())[0];
  const locationLabel = neighborhoodName || (shop.address ? getShortAddress(shop.address) : undefined);

  return (
    <ShopListItem
      shop={shop}
      onClick={onClick}
      subtitle={locationLabel}
      showDescription={false}
      badge={
        pick.rank ? (
          <div className="w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center text-[10px] font-semibold leading-none">
            {pick.rank}
          </div>
        ) : undefined
      }
      caption={
        pick.description ? (
          <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
            &ldquo;{pick.description}&rdquo;
          </p>
        ) : undefined
      }
    />
  );
}
