import { Shop } from '@/lib/types';
import { getShopDescription } from '@/lib/utils';

interface AboutSectionProps {
  shop: Shop;
}

// Get description appropriate for the About section
// For branded shops: show brand story/description (shop.description shown separately as "About This Branch")
// For independent shops: show shop description with brand fallback
function getAboutDescription(shop: Shop): string | null {
  if (!shop.independent && shop.brand) {
    // Branded shop: prefer brand story/description for the main "About" section
    if (shop.brand.story) return shop.brand.story;
    if (shop.brand.description) return shop.brand.description;
    // Fall back to shop description if brand has none
    if (shop.description) return shop.description;
    return null;
  }
  // Independent shop: use standard fallback chain
  return getShopDescription(shop);
}

// Get the preferred name for the header
function getAboutName(shop: Shop): string {
  // Use prefName if available, otherwise fall back to brand name or shop name
  return shop.prefName || shop.brand?.name || shop.name;
}

export function AboutSection({ shop }: AboutSectionProps) {
  const description = getAboutDescription(shop);

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
