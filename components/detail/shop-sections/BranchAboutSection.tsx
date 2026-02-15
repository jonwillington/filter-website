import { Shop } from '@/lib/types';


interface BranchAboutSectionProps {
  shop: Shop;
}

// Get the preferred name for the header
function getAboutName(shop: Shop): string {
  return shop.prefName || shop.brand?.name || shop.name;
}

export function BranchAboutSection({ shop }: BranchAboutSectionProps) {
  // Only show for non-independent brands that have their own branch description
  const isIndependent = shop.brand?.type?.toLowerCase() === 'independent';
  if (isIndependent || !shop.brand || !shop.description) return null;

  const storeName = getAboutName(shop);

  return (
    <div>
        <h3 className="text-lg font-medium text-primary mb-3">
          About the {storeName} store
        </h3>
        <p className="text-sm text-text leading-snug whitespace-pre-line">
          {shop.description}
        </p>
      </div>
  );
}
