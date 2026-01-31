'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { ModalBody, Skeleton } from '@heroui/react';
import { Brand, CoffeePartner, Country, Shop, Bean } from '@/lib/types';
import { ResponsiveModal } from '@/components/ui';
import { getMediaUrl, getShopDisplayName } from '@/lib/utils';
import {
  Globe,
  Instagram,
  Facebook,
  Bean as BeanIcon,
  MapPin,
  ExternalLink,
  Coffee,
  AlertCircle,
  RefreshCw,
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
  const isBlend = bean.type === 'blend';
  const origins = bean.origins || [];

  return (
    <div className="rounded-xl bg-surface hover:bg-border-default transition-colors h-full flex flex-col overflow-hidden">
      {/* Header with type badge */}
      <div className="relative w-full h-24 bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/30 flex items-center justify-center">
        <Coffee className="w-10 h-10 text-amber-600/40 dark:text-amber-400/30" />
        {/* Type badge */}
        <span
          className={`absolute bottom-2 left-3 px-2 py-0.5 text-xs font-medium rounded-full ${
            isBlend
              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
          }`}
        >
          {isBlend ? 'Blend' : 'Single Origin'}
        </span>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        {/* Bean name */}
        <h4 className="text-sm font-semibold text-primary mb-1 line-clamp-2">{bean.name}</h4>

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

  // Limit to 2 rows (8 items at lg:4 cols) unless expanded
  const MAX_VISIBLE = 8;
  const displayedBeans = expanded ? filteredBeans : filteredBeans.slice(0, MAX_VISIBLE);
  const hasMore = filteredBeans.length > MAX_VISIBLE;

  // Count beans by type for chip labels
  const blendsCount = useMemo(() => beans?.filter(b => b.type === 'blend').length ?? 0, [beans]);
  const singleOriginsCount = useMemo(() => beans?.filter(b => b.type !== 'blend').length ?? 0, [beans]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <BeanCardSkeleton />
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
              : 'bg-surface text-text-secondary hover:bg-border-default'
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
                : 'bg-surface text-text-secondary hover:bg-border-default'
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
                : 'bg-surface text-text-secondary hover:bg-border-default'
            }`}
          >
            Blend
          </button>
        )}
      </div>

      {/* Beans grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showStickyHeader, setShowStickyHeader] = useState(false);

  // Track scroll position to show/hide sticky header
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // Show sticky header after scrolling past the hero (roughly 200px)
      setShowStickyHeader(container.scrollTop > 180);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isOpen]);

  // Reset scroll position when modal opens
  useEffect(() => {
    if (isOpen && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
      setShowStickyHeader(false);
    }
  }, [isOpen]);

  const handleShopClick = (shop: Shop) => {
    onClose();
    // Small delay to let modal close animation complete
    setTimeout(() => {
      // Use the onShopSelect callback to navigate to shop (triggers map pan and drawer)
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
  const hasSocials = hasInstagram || hasFacebook || hasTikTok;

  // Get country - works for both Brand and CoffeePartner
  const country: Country | null | undefined = supplier.country;
  const countryName = country?.name;

  // Brand-specific fields
  const foundedYear = isBrand(supplier) ? getFoundedYear(supplier.founded) : null;
  const founderName = isBrand(supplier) ? supplier.founder : null;

  // Only show beans section for Brand type (not CoffeePartner)
  const showBeansSection = isBrand(supplier);

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      size="5xl"
      modalClassNames={{
        backdrop: 'bg-black/60 backdrop-blur-sm',
        base: 'bg-background overflow-hidden max-h-[90vh]',
        body: 'p-0',
      }}
    >
      <ModalBody className="p-0 overflow-hidden">
        {/* Scrollable container */}
        <div
          ref={scrollContainerRef}
          className="overflow-y-auto max-h-[90vh] relative"
        >
          {/* Sticky header - appears on scroll, fixed position within scroll container */}
          <div
            className={`sticky top-0 z-20 bg-background border-b border-border-default px-6 py-3 transition-all duration-200 ${
              showStickyHeader ? 'opacity-100' : 'opacity-0 pointer-events-none h-0 overflow-hidden border-0 py-0'
            }`}
          >
            <div className="flex items-center gap-3">
              <Avatar
                src={logoUrl || undefined}
                name={supplier.name}
                className="w-8 h-8 flex-shrink-0"
                showFallback
                fallback={<BeanIcon className="w-4 h-4" />}
              />
              <span className="font-medium text-primary truncate">{supplier.name}</span>
            </div>
          </div>

          {/* Hero Header */}
          <div className="relative">
            <div className="h-48 lg:h-56 overflow-hidden bg-surface">
              {bgImageUrl ? (
                <img
                  src={bgImageUrl}
                  alt={supplier.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-amber-100 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/20" />
              )}
            </div>
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

            {/* Visit Website button - top right */}
            {hasWebsite && (
              <a
                href={getWebsiteUrl(supplier.website!)}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute top-4 right-6 flex items-center gap-1.5 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium hover:bg-white/30 transition-colors"
              >
                <Globe className="w-4 h-4" />
                Visit Website
              </a>
            )}

            {/* Logo and brand info at bottom of hero */}
            <div className="absolute bottom-0 left-0 right-0 px-6 pb-5 pt-5">
              <div className="flex flex-col gap-3">
                {/* Logo */}
                <Avatar
                  src={logoUrl || undefined}
                  name={supplier.name}
                  className="w-14 h-14 lg:w-16 lg:h-16 ring-4 ring-white/20 shadow-lg"
                  showFallback
                  fallback={<BeanIcon className="w-5 h-5 lg:w-6 lg:h-6" />}
                />
                {/* Brand name and metadata */}
                <div>
                  <h2 className="text-3xl lg:text-4xl font-bold text-white mb-1 drop-shadow-lg">
                    {supplier.name}
                  </h2>
                  <p className="text-sm text-white/80 drop-shadow">
                    {founderName && `Founded by ${founderName}`}
                    {founderName && (countryName || foundedYear) && ' · '}
                    {countryName}
                    {countryName && foundedYear && ' · '}
                    {foundedYear && `Est. ${foundedYear}`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Content sections */}
          <div className="px-6 py-8">
            {/* Story Section - Full width */}
            {hasStory && (
              <div className="mb-10">
                <p className="text-base text-primary leading-relaxed max-w-prose">
                  {supplier.story}
                </p>
              </div>
            )}

            {/* Social Links - Inline text style */}
            {hasSocials && (
              <div className="flex items-center gap-4 text-sm text-text-secondary mb-12">
                {hasInstagram && (
                  <a
                    href={getInstagramUrl(supplier.instagram!)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-primary transition-colors"
                  >
                    <Instagram className="w-4 h-4" />
                    <span>{getInstagramHandle(supplier.instagram!)}</span>
                  </a>
                )}
                {hasFacebook && isBrand(supplier) && (
                  <a
                    href={getFacebookUrl(supplier.facebook!)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-primary transition-colors"
                  >
                    <Facebook className="w-4 h-4" />
                    <span>Facebook</span>
                  </a>
                )}
                {hasTikTok && isBrand(supplier) && (
                  <a
                    href={getTikTokUrl(supplier.tiktok!)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-primary transition-colors"
                  >
                    <TikTokIcon className="w-4 h-4" />
                    <span>{getTikTokHandle(supplier.tiktok!)}</span>
                  </a>
                )}
              </div>
            )}

            {/* Beans Section */}
            {showBeansSection && (
              <div className="mb-12">
                <h3 className="text-lg font-semibold text-primary mb-4">
                  Beans
                </h3>
                <BeansSection brandDocumentId={supplier.documentId} />
              </div>
            )}

            {/* Brand's Own Shops */}
            {ownShops.length > 0 && (
              <div className="mb-12">
                <h3 className="text-lg font-semibold text-primary mb-4">
                  {supplier.name} Locations
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {ownShops.map((shop) => (
                    <ShopCard key={shop.documentId} shop={shop} onClick={() => handleShopClick(shop)} />
                  ))}
                </div>
              </div>
            )}

            {/* Partner Cafés */}
            {partnerShops.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-primary mb-4">
                  Cafés Serving Their Beans
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {partnerShops.map((shop) => (
                    <ShopCard key={shop.documentId} shop={shop} onClick={() => handleShopClick(shop)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </ModalBody>
    </ResponsiveModal>
  );
}
