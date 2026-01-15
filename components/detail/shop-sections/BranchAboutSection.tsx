import { Shop } from '@/lib/types';
import { Divider } from '@heroui/react';

interface BranchAboutSectionProps {
  shop: Shop;
}

export function BranchAboutSection({ shop }: BranchAboutSectionProps) {
  // Only show for non-independent brands that have their own branch description
  const isIndependent = shop.brand?.type?.toLowerCase() === 'independent';
  if (isIndependent || !shop.brand || !shop.description) return null;

  return (
    <>
      <Divider className="my-5 opacity-30" />
      <div>
        <h3 className="text-base font-medium text-primary mb-3">
          About This Branch
        </h3>
        <p className="text-sm text-text leading-snug whitespace-pre-line">
          {shop.description}
        </p>
      </div>
    </>
  );
}
