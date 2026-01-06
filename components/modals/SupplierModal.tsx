'use client';

import { ModalBody } from '@heroui/react';
import { Brand, CoffeePartner, Country } from '@/lib/types';
import { ResponsiveModal, CountryChip } from '@/components/ui';
import { getMediaUrl } from '@/lib/utils';
import { Globe, Instagram, Facebook, Bean } from 'lucide-react';

// TikTok icon (not in lucide-react)
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  );
}

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Brand | CoffeePartner | null;
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

// Extract year from founded date
function getFoundedYear(founded: string | null | undefined): string | null {
  if (!founded) return null;
  // Try to extract a 4-digit year
  const match = founded.match(/\d{4}/);
  return match ? match[0] : null;
}

export function SupplierModal({ isOpen, onClose, supplier }: SupplierModalProps) {
  if (!supplier) return null;

  const logoUrl = getMediaUrl(supplier.logo);
  const hasStory = supplier.story && supplier.story.trim().length > 0;
  const hasInstagram = supplier.instagram && supplier.instagram.trim().length > 0;
  const hasWebsite = supplier.website && supplier.website.trim().length > 0;
  const hasFacebook = isBrand(supplier) && supplier.facebook && supplier.facebook.trim().length > 0;
  const hasTikTok = isBrand(supplier) && supplier.tiktok && supplier.tiktok.trim().length > 0;
  const hasSocials = hasInstagram || hasWebsite || hasFacebook || hasTikTok;

  // Get country - works for both Brand and CoffeePartner
  const country: Country | null | undefined = supplier.country;
  const countryName = country?.name;

  // Brand-specific fields
  const foundedYear = isBrand(supplier) ? getFoundedYear(supplier.founded) : null;
  const roastCountries = isBrand(supplier) ? (supplier.ownRoastCountry ?? []) : [];
  const hasRoastCountries = roastCountries.length > 0;

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      modalClassNames={{
        backdrop: 'bg-black/60 backdrop-blur-sm',
        base: 'bg-background',
      }}
    >
      <ModalBody className="px-6 pb-6 pt-2">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={supplier.name}
              className="w-24 h-24 rounded-2xl object-cover"
            />
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-surface flex items-center justify-center">
              <Bean className="w-10 h-10 text-text-secondary" />
            </div>
          )}
        </div>

        {/* Name */}
        <h2 className="text-xl font-display text-center text-primary mb-1">
          {supplier.name}
        </h2>

        {/* Country & Founded */}
        {(countryName || foundedYear) && (
          <p className="text-sm text-text-secondary text-center mb-4">
            {countryName}
            {countryName && foundedYear && ' · '}
            {foundedYear && `Est. ${foundedYear}`}
          </p>
        )}

        {/* Story */}
        {hasStory && (
          <div className="mt-4">
            <p className="text-sm text-primary leading-relaxed">
              {supplier.story}
            </p>
          </div>
        )}

        {/* Roast Countries */}
        {hasRoastCountries && (
          <div className="mt-5">
            <p className="text-xs uppercase tracking-wider text-text-secondary mb-2">
              Roasting beans from
            </p>
            <div className="flex flex-wrap gap-2">
              {roastCountries.map((c) => (
                <CountryChip
                  key={c.documentId}
                  code={c.code}
                  name={c.name}
                />
              ))}
            </div>
          </div>
        )}

        {/* Social Links */}
        {hasSocials && (
          <div className="flex items-center justify-center gap-3 mt-6">
            {hasInstagram && (
              <a
                href={getInstagramUrl(supplier.instagram!)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md transition-transform hover:scale-105"
                style={{
                  background:
                    'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                }}
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
            )}
            {hasFacebook && isBrand(supplier) && (
              <a
                href={getFacebookUrl(supplier.facebook!)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md transition-transform hover:scale-105"
                style={{ background: '#1877F2' }}
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
            )}
            {hasTikTok && isBrand(supplier) && (
              <a
                href={getTikTokUrl(supplier.tiktok!)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md transition-transform hover:scale-105"
                style={{ background: '#000000' }}
                aria-label="TikTok"
              >
                <TikTokIcon className="w-5 h-5" />
              </a>
            )}
            {hasWebsite && (
              <a
                href={getWebsiteUrl(supplier.website!)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md transition-transform hover:scale-105"
                style={{ background: '#374151' }}
                aria-label="Website"
              >
                <Globe className="w-5 h-5" />
              </a>
            )}
          </div>
        )}
      </ModalBody>
    </ResponsiveModal>
  );
}
