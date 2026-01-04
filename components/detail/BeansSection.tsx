import { Shop, CoffeePartner } from '@/lib/types';
import { Avatar } from '@heroui/react';
import { getMediaUrl } from '@/lib/utils';
import { CountryChip } from '@/components/ui';
import { Bean } from 'lucide-react';

interface BeansSectionProps {
  shop: Shop;
}

function PartnerCard({ partner }: { partner: CoffeePartner }) {
  const logoUrl = getMediaUrl(partner.logo);

  return (
    <div className="flex items-center gap-3">
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
  const ownRoastDesc = brand?.ownRoastDesc;
  const ownRoastCountries = brand?.ownRoastCountry ?? [];

  // Determine what to show
  const hasInHouseRoast = roastsOwnBeans && brand?.name;
  const hasSuppliers = suppliers.length > 0;
  const hasCoffeePartner = shopCoffeePartner || brandCoffeePartner;

  if (!hasInHouseRoast && !hasSuppliers && !hasCoffeePartner) return null;

  return (
    <div className="space-y-4">
      {/* In-house roast */}
      {hasInHouseRoast && (
        <div>
          <h3 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-2">
            Coffee Roasting
          </h3>
          <p className="text-sm text-text">
            {ownRoastDesc || `Roasted in-house by ${brand.name}`}
          </p>
          {ownRoastCountries.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {ownRoastCountries.map((country) => (
                <CountryChip
                  key={country.documentId}
                  code={country.code}
                  name={country.name}
                />
              ))}
            </div>
          )}
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
  );
}
