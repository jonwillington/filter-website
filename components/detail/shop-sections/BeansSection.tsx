'use client';

import { useState } from 'react';
import { Shop, Brand, CoffeePartner } from '@/lib/types';
import { Avatar, Divider } from '@heroui/react';
import { getMediaUrl } from '@/lib/utils';
import { CountryChip } from '@/components/ui';
import { Bean, ChevronRight, Check } from 'lucide-react';
import { SupplierModal } from '@/components/modals/SupplierModal';

interface BeansSectionProps {
  shop: Shop;
  onShopSelect?: (shop: Shop) => void;
}

interface SupplierCardProps {
  supplier: Brand;
  onClick?: () => void;
}

function SupplierCard({ supplier, onClick }: SupplierCardProps) {
  const logoUrl = getMediaUrl(supplier.logo);
  const shortDescription = supplier.description;
  const country = supplier.country;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-start gap-3 p-3 rounded-xl bg-surface-elevated dark:bg-white/10 transition-colors hover:bg-border-default dark:hover:bg-white/15 cursor-pointer text-left group"
    >
      <Avatar
        src={logoUrl || undefined}
        name={supplier.name}
        size="sm"
        className="flex-shrink-0 mt-0.5"
        showFallback
        fallback={<Bean className="w-4 h-4" />}
      />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-textSecondary mb-0.5">
          Beans from
        </p>
        <p className="text-sm font-medium text-text truncate">{supplier.name}</p>
        {shortDescription && (
          <p className="text-xs text-text-secondary mt-1 line-clamp-2">{shortDescription}</p>
        )}
        {country && (
          <div className="mt-2">
            <CountryChip code={country.code} name={country.name} />
          </div>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-textSecondary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
    </button>
  );
}

interface PartnerCardProps {
  partner: CoffeePartner;
  onClick?: () => void;
}

function PartnerCard({ partner, onClick }: PartnerCardProps) {
  const logoUrl = getMediaUrl(partner.logo);
  const shortDescription = partner.story;
  const country = partner.country;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-start gap-3 p-3 rounded-xl bg-surface-elevated dark:bg-white/10 transition-colors hover:bg-border-default dark:hover:bg-white/15 cursor-pointer text-left group"
    >
      <Avatar
        src={logoUrl || undefined}
        name={partner.name}
        size="sm"
        className="flex-shrink-0 mt-0.5"
        showFallback
        fallback={<Bean className="w-4 h-4" />}
      />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-textSecondary mb-0.5">
          Beans from
        </p>
        <p className="text-sm font-medium text-text truncate">{partner.name}</p>
        {shortDescription && (
          <p className="text-xs text-text-secondary mt-1 line-clamp-2">{shortDescription}</p>
        )}
        {country && (
          <div className="mt-2">
            <CountryChip code={country.code} name={country.name} />
          </div>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-textSecondary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
    </button>
  );
}

export function BeansSection({ shop, onShopSelect }: BeansSectionProps) {
  const [selectedSupplier, setSelectedSupplier] = useState<Brand | CoffeePartner | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const handleSupplierClick = (supplier: Brand | CoffeePartner) => {
    setSelectedSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  if (!hasInHouseRoast && !hasSuppliers && !hasCoffeePartner) return null;

  return (
    <>
      <Divider className="my-5 opacity-30" />
      <div className="space-y-4">
      {/* Roasting header */}
      <h3 className="text-lg font-medium text-primary mb-2">
        Roasting
      </h3>

      {/* In-house roasting badge - clickable to open brand modal */}
      {hasInHouseRoast && brand && (
        <button
          type="button"
          onClick={() => handleSupplierClick(brand)}
          className="w-full flex items-center gap-3 p-3 rounded-xl bg-surface-elevated dark:bg-white/10 transition-colors hover:bg-border-default dark:hover:bg-white/15 cursor-pointer text-left group"
        >
          <Avatar
            src={getMediaUrl(brand.logo) || undefined}
            name={brand.name}
            size="sm"
            className="flex-shrink-0"
            showFallback
            fallback={<Bean className="w-4 h-4" />}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-primary">{brand.name}</p>
            <p className="text-sm text-text-secondary flex items-center gap-1.5">
              Roasts their own beans
              <span className="w-4 h-4 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
              </span>
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-textSecondary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        </button>
      )}

      {/* Suppliers (Brand objects) */}
      {hasSuppliers && suppliers.map((supplier) => (
        <SupplierCard
          key={supplier.documentId}
          supplier={supplier}
          onClick={() => handleSupplierClick(supplier)}
        />
      ))}

      {/* Shop or brand coffee partner (CoffeePartner - only if no suppliers) */}
      {!hasSuppliers && hasCoffeePartner && (
        <PartnerCard
          partner={shopCoffeePartner || brandCoffeePartner!}
          onClick={() => handleSupplierClick(shopCoffeePartner || brandCoffeePartner!)}
        />
      )}

      {/* Description - below supplier cell */}
      {ownRoastDesc && (
        <p className="text-sm text-text leading-snug">
          {ownRoastDesc}
        </p>
      )}

      {/* Own roast countries */}
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

    {/* Supplier Detail Modal */}
    <SupplierModal
      isOpen={isModalOpen}
      onClose={handleCloseModal}
      supplier={selectedSupplier}
      onShopSelect={onShopSelect}
    />
    </>
  );
}
