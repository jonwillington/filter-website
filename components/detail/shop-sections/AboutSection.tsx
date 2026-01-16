import { Shop } from '@/lib/types';
import { getShopDescription } from '@/lib/utils';

interface AboutSectionProps {
  shop: Shop;
}

// Get the preferred name for the header
function getAboutName(shop: Shop): string {
  // Use prefName if available, otherwise fall back to brand name or shop name
  return shop.prefName || shop.brand?.name || shop.name;
}

export function AboutSection({ shop }: AboutSectionProps) {
  const isChain = !shop.independent && shop.brand;

  if (isChain) {
    // For chains: show brand story/description without dynamic header
    const brandDescription = shop.brand?.story || shop.brand?.description;
    if (!brandDescription) return null;

    return (
      <div className="mt-5">
        <p className="text-sm text-text leading-snug whitespace-pre-line">
          {brandDescription}
        </p>
      </div>
    );
  }

  // For independent shops: show shop description with dynamic header
  const description = getShopDescription(shop);
  if (!description) return null;

  const storeName = getAboutName(shop);

  return (
    <div className="mt-5">
      <h3 className="text-lg font-semibold text-primary mb-3">
        About the {storeName} store
      </h3>
      <p className="text-sm text-text leading-snug whitespace-pre-line">
        {description}
      </p>
    </div>
  );
}
