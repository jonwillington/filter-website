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
  const brandStatement = shop.brand?.statement;

  if (isChain) {
    // For chains: show brand statement + story/description
    const brandDescription = shop.brand?.story || shop.brand?.description;
    if (!brandStatement && !brandDescription) return null;

    return (
      <div>
        {brandStatement && (
          <p className="text-base font-medium text-primary leading-snug mb-3">
            {brandStatement}
          </p>
        )}
        {brandDescription && (
          <p className="text-sm text-text leading-snug whitespace-pre-line">
            {brandDescription}
          </p>
        )}
      </div>
    );
  }

  // For independent shops: show brand statement + shop description
  const description = getShopDescription(shop);
  if (!brandStatement && !description) return null;

  const storeName = getAboutName(shop);

  return (
    <div>
      <h3 className="text-lg font-medium text-primary mb-3">
        About the {storeName} store
      </h3>
      {brandStatement && (
        <p className="text-base font-medium text-primary leading-snug mb-3">
          {brandStatement}
        </p>
      )}
      {description && (
        <p className="text-sm text-text leading-snug whitespace-pre-line">
          {description}
        </p>
      )}
    </div>
  );
}
