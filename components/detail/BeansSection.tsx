import { Shop, CoffeePartner } from '@/lib/types';
import { Avatar } from '@heroui/react';
import { getMediaUrl } from '@/lib/utils';
import { Flame, Bean } from 'lucide-react';

interface BeansSectionProps {
  shop: Shop;
}

function PartnerCard({ partner }: { partner: CoffeePartner }) {
  const logoUrl = getMediaUrl(partner.logo);

  return (
    <div className="flex items-center gap-3 p-3 bg-surface rounded-lg">
      <Avatar
        src={logoUrl || undefined}
        name={partner.name}
        size="sm"
        className="flex-shrink-0"
        showFallback
        fallback={<Bean className="w-4 h-4" />}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text truncate">{partner.name}</p>
        {partner.country && (
          <p className="text-xs text-textSecondary">{partner.country}</p>
        )}
      </div>
    </div>
  );
}

export function BeansSection({ shop }: BeansSectionProps) {
  const brand = shop.brand;
  const roastsOwnBeans = brand?.roastOwnBeans;
  const suppliers = brand?.suppliers ?? [];
  const brandCoffeePartner = brand?.coffee_partner;
  const shopCoffeePartner = shop.coffee_partner;

  // Determine what to show
  const hasInHouseRoast = roastsOwnBeans && brand?.name;
  const hasSuppliers = suppliers.length > 0;
  const hasCoffeePartner = shopCoffeePartner || brandCoffeePartner;

  if (!hasInHouseRoast && !hasSuppliers && !hasCoffeePartner) return null;

  return (
    <div>
      <h3 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-3">
        Coffee
      </h3>
      <div className="space-y-2">
        {/* In-house roast */}
        {hasInHouseRoast && (
          <div className="flex items-center gap-3 p-3 bg-accent/10 rounded-lg">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
              <Flame className="w-4 h-4 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-accent">In-house roast</p>
              <p className="text-xs text-textSecondary">Roasted by {brand.name}</p>
            </div>
          </div>
        )}

        {/* Suppliers */}
        {hasSuppliers && suppliers.map((supplier) => (
          <PartnerCard key={supplier.documentId} partner={supplier} />
        ))}

        {/* Shop or brand coffee partner (if no suppliers) */}
        {!hasSuppliers && hasCoffeePartner && (
          <PartnerCard partner={shopCoffeePartner || brandCoffeePartner!} />
        )}
      </div>
    </div>
  );
}
