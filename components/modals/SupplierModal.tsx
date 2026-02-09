'use client';

import { useMemo, useState } from 'react';
import { Skeleton } from '@heroui/react';
import { Brand, CoffeePartner, Country, Shop, Bean } from '@/lib/types';
import { ResponsiveModal } from '@/components/ui';
import { getMediaUrl, getShopDisplayName } from '@/lib/utils';
import {
  Globe,
  Instagram,
  Facebook,
  Bean as BeanIcon,
  Coffee,
  AlertCircle,
  RefreshCw,
  MapPin,
} from 'lucide-react';
import { Avatar } from '@heroui/react';
import { useShopsQuery } from '@/lib/hooks/useDataQueries';
import { useBeansByBrand } from '@/lib/hooks/useBeansByBrand';

// TikTok icon (not in lucide-react)
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Brand | CoffeePartner | null;
  onShopSelect?: (shop: Shop) => void;
}

// Type guard to check if supplier is a Brand
function isBrand(supplier: Brand | CoffeePartner): supplier is Brand {
  return 'ownRoastCountry' in supplier || 'founded' in supplier;
}

// Normalize Instagram URL
function getInstagramUrl(handle: string) {
  if (handle.startsWith('http')) return handle;
  const cleanHandle = handle
    .replace('@', '')
    .replace(/^https?:\/\/(www\.)?instagram\.com\//, '');
  return `https://instagram.com/${cleanHandle}`;
}

// Get Instagram handle for display
function getInstagramHandle(handle: string) {
  if (handle.startsWith('http')) {
    const match = handle.match(/instagram\.com\/([^/?]+)/);
    return match ? `@${match[1]}` : 'Instagram';
  }
  return handle.startsWith('@') ? handle : `@${handle.replace(/^https?:\/\/(www\.)?instagram\.com\//, '')}`;
}

// Normalize website URL
function getWebsiteUrl(url: string) {
  if (url.startsWith('http')) return url;
  return `https://${url}`;
}

// Normalize Facebook URL
function getFacebookUrl(handle: string) {
  if (handle.startsWith('http')) return handle;
  return `https://facebook.com/${handle}`;
}

// Normalize TikTok URL
function getTikTokUrl(handle: string) {
  if (handle.startsWith('http')) return handle;
  const cleanHandle = handle.replace('@', '');
  return `https://tiktok.com/@${cleanHandle}`;
}

// Get TikTok handle for display
function getTikTokHandle(handle: string) {
  if (handle.startsWith('http')) {
    const match = handle.match(/tiktok\.com\/@?([^/?]+)/);
    return match ? `@${match[1]}` : 'TikTok';
  }
  return handle.startsWith('@') ? handle : `@${handle}`;
}

// Extract year from founded date
function getFoundedYear(founded: string | null | undefined): string | null {
  if (!founded) return null;
  // Try to extract a 4-digit year
  const match = founded.match(/\d{4}/);
  return match ? match[0] : null;
}

// Get flag URL for country code
function getFlagUrl(code: string) {
  return `https://flagcdn.com/w40/${code.toLowerCase()}.png`;
}

// Find shops that use a specific supplier, separated into own shops and partner shops
function useShopsUsingSupplier(supplier: Brand | CoffeePartner | null): {
  ownShops: Shop[];
  partnerShops: Shop[];
} {
  const { data: allShops } = useShopsQuery();

  return useMemo(() => {
    if (!supplier || !allShops) return { ownShops: [], partnerShops: [] };

    const ownShops: Shop[] = [];
    const partnerShops: Shop[] = [];

    allShops.forEach((shop) => {
      // Brand's own shops - shop's brand IS this brand (e.g., WatchHouse locations)
      const isOwnBrand = shop.brand?.documentId === supplier.documentId;

      if (isOwnBrand) {
        ownShops.push(shop);
        return;
      }

      // Partner shops - use beans but are a different brand
      const brandSuppliers = shop.brand?.suppliers ?? [];
      const hasAsSupplier = brandSuppliers.some(
        (s) => s.documentId === supplier.documentId
      );

      const brandPartner = shop.brand?.coffee_partner;
      const hasAsBrandPartner = brandPartner?.documentId === supplier.documentId;

      const shopPartner = shop.coffee_partner;
      const hasAsShopPartner = shopPartner?.documentId === supplier.documentId;

      if (hasAsSupplier || hasAsBrandPartner || hasAsShopPartner) {
        partnerShops.push(shop);
      }
    });

    return { ownShops, partnerShops };
  }, [supplier, allShops]);
}

// Format roast level for display
function formatRoastLevel(level: Bean['roastLevel']): string {
  if (!level) return '';
  const labels: Record<string, string> = {
    light: 'Light',
    'light-medium': 'Light-Medium',
    medium: 'Medium',
    'medium-dark': 'Medium-Dark',
    dark: 'Dark',
  };
  return labels[level] || level;
}

// Bean Card component for grid layout
function BeanCard({ bean }: { bean: Bean }) {
  const origins = bean.origins || [];
  const photoUrl = getMediaUrl(bean.photo);

  return (
    <div className="rounded-xl bg-surface hover:bg-border-default transition-colors h-full flex flex-col overflow-hidden">
      {/* Photo or gradient placeholder */}
      {photoUrl ? (
        <div className="w-full h-24">
          <img src={photoUrl} alt={bean.name} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-full h-24 bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/30 flex items-center justify-center">
          <Coffee className="w-10 h-10 text-amber-600/40 dark:text-amber-400/30" />
        </div>
      )}

      <div className="p-4 flex-1 flex flex-col">
        {/* Bean name */}
        <h4 className="text-sm font-medium text-primary mb-1 line-clamp-2">{bean.name}</h4>

        {/* Short description */}
        {bean.shortDescription && (
          <p className="text-xs text-text-secondary mb-2 line-clamp-2">
            {bean.shortDescription}
          </p>
        )}

        {/* Bottom section - always at bottom */}
        <div className="mt-auto pt-2">
          {/* Origin chips */}
          {origins.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {origins.slice(0, 2).map((origin) => (
                <span
                  key={origin.documentId}
                  className="px-1.5 py-0.5 text-xs rounded bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300"
                >
                  {origin.name}
                </span>
              ))}
              {origins.length > 2 && (
                <span className="px-1.5 py-0.5 text-xs text-text-secondary">
                  +{origins.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Bean card skeleton for loading state
function BeanCardSkeleton() {
  return (
    <div className="rounded-xl bg-surface overflow-hidden">
      <Skeleton className="w-full h-24" />
      <div className="p-4">
        <Skeleton className="w-16 h-5 rounded-full mb-2" />
        <Skeleton className="w-3/4 h-4 rounded mb-1" />
        <Skeleton className="w-1/2 h-3 rounded mb-2" />
        <div className="flex gap-1">
          <Skeleton className="w-12 h-4 rounded" />
          <Skeleton className="w-14 h-4 rounded" />
        </div>
      </div>
    </div>
  );
}

// Shop Card component for grid layout
function ShopCard({ shop, onClick }: { shop: Shop; onClick: () => void }) {
  const imageUrl = getMediaUrl(shop.featured_image);
  const displayName = getShopDisplayName(shop);
  const brandLogoUrl = getMediaUrl(shop.brand?.logo);
  const cityArea = shop.city_area?.name;
  const location = shop.location?.name;
  const locationText = [cityArea, location].filter(Boolean).join(', ');

  return (
    <button
      onClick={onClick}
      className="group text-left transition-transform duration-200 hover:scale-[1.02] h-full"
    >
      <div className="bg-surface rounded-xl overflow-hidden h-full flex flex-col">
        {/* Feature image */}
        <div className="relative w-full h-24">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-border-default flex items-center justify-center">
              <MapPin className="w-5 h-5 text-text-secondary" />
            </div>
          )}
          {/* Brand logo */}
          {brandLogoUrl && (
            <div className="absolute bottom-2 left-3.5">
              <Avatar
                src={brandLogoUrl}
                name={shop.brand?.name}
                className="w-6 h-6 ring-2 ring-white/80 shadow-sm"
                showFallback
                fallback={<Coffee className="w-3 h-3" />}
              />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3.5 flex-1 flex flex-col">
          <p className="text-sm font-medium text-primary line-clamp-2 mb-0.5">
            {displayName}
          </p>
          {locationText && (
            <p className="text-xs text-text-secondary line-clamp-1 mt-auto">
              {locationText}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

// Bean filter type
type BeanFilter = 'all' | 'blend' | 'single-origin';

// Beans section component with grid layout and filter chips
function BeansSection({ brandDocumentId }: { brandDocumentId: string }) {
  const { data: beans, isLoading, isError, refetch } = useBeansByBrand(brandDocumentId);
  const [filter, setFilter] = useState<BeanFilter>('all');
  const [expanded, setExpanded] = useState(false);

  // Filter beans based on selected type
  const filteredBeans = useMemo(() => {
    if (!beans) return [];
    if (filter === 'all') return beans;
    if (filter === 'blend') return beans.filter(b => b.type === 'blend');
    return beans.filter(b => b.type !== 'blend'); // single-origin
  }, [beans, filter]);

  // Limit to 3 rows (9 items at 3 cols) unless expanded
  const MAX_VISIBLE = 9;
  const displayedBeans = expanded ? filteredBeans : filteredBeans.slice(0, MAX_VISIBLE);
  const hasMore = filteredBeans.length > MAX_VISIBLE;

  // Count beans by type for chip labels
  const blendsCount = useMemo(() => beans?.filter(b => b.type === 'blend').length ?? 0, [beans]);
  const singleOriginsCount = useMemo(() => beans?.filter(b => b.type !== 'blend').length ?? 0, [beans]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        <BeanCardSkeleton />
        <BeanCardSkeleton />
        <BeanCardSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <AlertCircle className="w-6 h-6 text-text-secondary mb-2" />
        <p className="text-sm text-text-secondary mb-2">
          Could not load beans
        </p>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-accent hover:bg-surface rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  if (!beans || beans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <Coffee className="w-6 h-6 text-text-secondary mb-2" />
        <p className="text-sm text-text-secondary">
          No beans listed yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter chips */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-contrastBlock text-contrastText'
              : 'bg-white dark:bg-white/10 text-text-secondary border border-border-default hover:border-text-secondary'
          }`}
        >
          All
        </button>
        {singleOriginsCount > 0 && (
          <button
            onClick={() => setFilter('single-origin')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === 'single-origin'
                ? 'bg-contrastBlock text-contrastText'
                : 'bg-white dark:bg-white/10 text-text-secondary border border-border-default hover:border-text-secondary'
            }`}
          >
            Single Origin
          </button>
        )}
        {blendsCount > 0 && (
          <button
            onClick={() => setFilter('blend')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === 'blend'
                ? 'bg-contrastBlock text-contrastText'
                : 'bg-white dark:bg-white/10 text-text-secondary border border-border-default hover:border-text-secondary'
            }`}
          >
            Blend
          </button>
        )}
      </div>

      {/* Beans grid */}
      <div className="grid grid-cols-3 gap-3">
        {displayedBeans.map((bean) => (
          <BeanCard key={bean.documentId} bean={bean} />
        ))}
      </div>

      {/* View more/less button */}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-text-secondary hover:text-primary transition-colors"
        >
          {expanded ? 'View less' : `View all ${filteredBeans.length} beans`}
        </button>
      )}
    </div>
  );
}

export function SupplierModal({ isOpen, onClose, supplier, onShopSelect }: SupplierModalProps) {
  const { ownShops, partnerShops } = useShopsUsingSupplier(supplier);

  const handleShopClick = (shop: Shop) => {
    onClose();
    setTimeout(() => {
      onShopSelect?.(shop);
    }, 150);
  };

  if (!supplier) return null;

  const logoUrl = getMediaUrl(supplier.logo);
  const bgImageUrl = getMediaUrl(supplier['bg-image']);
  const hasStory = supplier.story && supplier.story.trim().length > 0;
  const hasInstagram = supplier.instagram && supplier.instagram.trim().length > 0;
  const hasWebsite = supplier.website && supplier.website.trim().length > 0;
  const hasFacebook =
    isBrand(supplier) && supplier.facebook && supplier.facebook.trim().length > 0;
  const hasTikTok =
    isBrand(supplier) && supplier.tiktok && supplier.tiktok.trim().length > 0;
  const hasSocials = hasInstagram || hasWebsite || hasFacebook || hasTikTok;

  // Get country - works for both Brand and CoffeePartner
  const country: Country | null | undefined = supplier.country;
  const countryName = country?.name;
  const countryCode = country?.code;

  // Brand-specific fields
  const foundedYear = isBrand(supplier) ? getFoundedYear(supplier.founded) : null;
  const founderName = isBrand(supplier) ? supplier.founder : null;

  // Only show beans section for Brand type (not CoffeePartner)
  const showBeansSection = isBrand(supplier);

  // Total shops count
  const totalShops = ownShops.length + partnerShops.length;
  const showLocations = totalShops > 1;

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      size="5xl"
      hideCloseButton
      modalClassNames={{
        wrapper: 'z-[1100]',
        backdrop: 'z-[1100]',
        base: `!bg-[var(--surface-warm)] ${showLocations ? '!max-w-[1400px]' : '!max-w-[960px]'}`,
      }}
    >
      {/* Close button */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 backdrop-blur-sm flex items-center justify-center text-white transition-colors"
        >
          <span className="sr-only">Close</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Two or three-column layout on desktop depending on shop count */}
      <div className={`lg:grid ${showLocations ? 'lg:grid-cols-[1fr_1.5fr_1.2fr]' : 'lg:grid-cols-[1fr_1.5fr]'} gap-8 p-6`}>
        {/* Left column - Brand details with fixed header and scrollable content */}
        <div className="flex flex-col h-full lg:border-r lg:border-black/5 lg:pr-6 lg:max-h-[75vh]">
          {/* Fixed header: Logo + name + country */}
          <div className="flex-shrink-0">
            {/* Logo */}
            <Avatar
              src={logoUrl || undefined}
              name={supplier.name}
              className="w-16 h-16 mb-4"
              showFallback
              fallback={<BeanIcon className="w-6 h-6" />}
            />

            {/* Brand name */}
            <h2 className="text-4xl lg:text-5xl font-medium text-primary leading-tight">
              {supplier.name}
            </h2>

            {/* Country with flag */}
            {countryName && (
              <div className="flex items-center gap-1.5 mt-2">
                {countryCode && (
                  <span className="w-3.5 h-3.5 rounded-full overflow-hidden flex-shrink-0 border border-border-default">
                    <img
                      src={getFlagUrl(countryCode)}
                      alt={countryName}
                      className="object-cover w-full h-full"
                    />
                  </span>
                )}
                <p className="text-sm text-text-secondary">{countryName}</p>
              </div>
            )}
          </div>

          {/* Scrollable content: Stats, story, socials */}
          <div className="flex-1 overflow-y-auto mt-3">
            {/* Stats row */}
            <div className="flex items-center gap-4 text-sm">
              {foundedYear && (
                <span className="text-text-secondary">Est. {foundedYear}</span>
              )}
              {founderName && (
                <>
                  {foundedYear && <span className="text-text-secondary/30">·</span>}
                  <span className="text-text-secondary">{founderName}</span>
                </>
              )}
              {totalShops > 0 && (
                <>
                  {(foundedYear || founderName) && <span className="text-text-secondary/30">·</span>}
                  <span className="text-text-secondary">{totalShops} {totalShops === 1 ? 'location' : 'locations'}</span>
                </>
              )}
            </div>

            {/* Story */}
            {hasStory && (
              <div className="mt-6">
                <h3 className="text-xs font-medium text-primary opacity-60 uppercase tracking-wider mb-3">About</h3>
                <p className="text-xs text-text-secondary leading-relaxed">{supplier.story}</p>
              </div>
            )}

            {/* Socials and links */}
            <div className="mt-6 pt-6 border-t border-black/5 space-y-3">
              {hasSocials && (
                <div className="space-y-2">
                  <h3 className="text-xs font-medium text-primary opacity-60 uppercase tracking-wider">Connect</h3>
                  <div className="flex flex-wrap gap-2">
                    {hasWebsite && (
                      <a
                        href={getWebsiteUrl(supplier.website!)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-white/10 border border-border-default text-sm text-text-secondary hover:text-primary transition-colors"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>Website</span>
                      </a>
                    )}
                    {hasInstagram && (
                      <a
                        href={getInstagramUrl(supplier.instagram!)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-white/10 border border-border-default text-sm text-text-secondary hover:text-primary transition-colors"
                      >
                        <Instagram className="w-3.5 h-3.5" />
                        <span>{getInstagramHandle(supplier.instagram!)}</span>
                      </a>
                    )}
                    {hasFacebook && isBrand(supplier) && (
                      <a
                        href={getFacebookUrl(supplier.facebook!)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-white/10 border border-border-default text-sm text-text-secondary hover:text-primary transition-colors"
                      >
                        <Facebook className="w-3.5 h-3.5" />
                        <span>Facebook</span>
                      </a>
                    )}
                    {hasTikTok && isBrand(supplier) && (
                      <a
                        href={getTikTokUrl(supplier.tiktok!)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-white/10 border border-border-default text-sm text-text-secondary hover:text-primary transition-colors"
                      >
                        <TikTokIcon className="w-3.5 h-3.5" />
                        <span>{getTikTokHandle(supplier.tiktok!)}</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Background image */}
              {bgImageUrl && (
                <div className="relative w-full h-32 rounded-xl overflow-hidden mt-4">
                  <img
                    src={bgImageUrl}
                    alt={supplier.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Middle column - Beans */}
        <div className={`mt-8 lg:mt-0 ${showLocations ? 'lg:border-r lg:border-black/5 lg:pr-6' : ''} lg:max-h-[75vh] lg:overflow-y-auto`}>
          {showBeansSection && (
            <div>
              <h3 className="text-xs font-medium text-primary opacity-60 uppercase tracking-wider mb-4">Beans</h3>
              <BeansSection brandDocumentId={supplier.documentId} />
            </div>
          )}
        </div>

        {/* Right column - Locations (hidden when only 1 shop) */}
        {showLocations && (
          <div className="mt-8 lg:mt-0 lg:max-h-[75vh] lg:overflow-y-auto">
            {/* Brand's Own Shops */}
            {ownShops.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xs font-medium text-primary opacity-60 uppercase tracking-wider mb-4">
                  {ownShops.length} {supplier.name} {ownShops.length === 1 ? 'Location' : 'Locations'}
                </h3>
                <div className="space-y-2">
                  {ownShops.map((shop) => {
                    const imageUrl = getMediaUrl(shop.featured_image);
                    const displayName = getShopDisplayName(shop);
                    const locationText = [shop.city_area?.name, shop.location?.name].filter(Boolean).join(', ');

                    return (
                      <button
                        key={shop.documentId}
                        onClick={() => handleShopClick(shop)}
                        className="w-full text-left py-3 group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-base text-primary leading-tight line-clamp-1 group-hover:text-amber-900 dark:group-hover:text-amber-700 transition-colors">
                              {displayName}
                            </h4>
                            {locationText && (
                              <p className="text-sm text-text-secondary line-clamp-1 mt-0.5">{locationText}</p>
                            )}
                          </div>
                          <div className="relative w-28 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-white/5">
                            {imageUrl ? (
                              <img src={imageUrl} alt={displayName} className="w-full h-full object-cover" />
                            ) : null}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Partner Cafés */}
            {partnerShops.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-primary opacity-60 uppercase tracking-wider mb-4">
                  {partnerShops.length} {partnerShops.length === 1 ? 'Café' : 'Cafés'} Serving Their Beans
                </h3>
                <div className="space-y-2">
                  {partnerShops.map((shop) => {
                    const imageUrl = getMediaUrl(shop.featured_image);
                    const logoUrl = getMediaUrl(shop.brand?.logo);
                    const displayName = getShopDisplayName(shop);
                    const locationText = [shop.city_area?.name, shop.location?.name].filter(Boolean).join(', ');

                    return (
                      <button
                        key={shop.documentId}
                        onClick={() => handleShopClick(shop)}
                        className="w-full text-left py-3 group"
                      >
                        <div className="flex items-center gap-3">
                          {logoUrl && (
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-border-default flex-shrink-0">
                              <img src={logoUrl} alt={shop.brand?.name} className="object-cover w-full h-full" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-base text-primary leading-tight line-clamp-1 group-hover:text-amber-900 dark:group-hover:text-amber-700 transition-colors">
                              {displayName}
                            </h4>
                            {locationText && (
                              <p className="text-sm text-text-secondary line-clamp-1 mt-0.5">{locationText}</p>
                            )}
                          </div>
                          <div className="relative w-28 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-white/5">
                            {imageUrl ? (
                              <img src={imageUrl} alt={displayName} className="w-full h-full object-cover" />
                            ) : null}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty state */}
            {ownShops.length === 0 && partnerShops.length === 0 && (
              <div className="bg-white/50 dark:bg-white/5 rounded-lg p-4">
                <h4 className="text-sm font-medium text-primary mb-2">No locations yet</h4>
                <p className="text-xs text-text-secondary">
                  We haven&apos;t found any cafés serving {supplier.name} beans yet.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </ResponsiveModal>
  );
}
