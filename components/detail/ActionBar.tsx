'use client';

import { Shop } from '@/lib/types';
import { Button } from '@heroui/react';
import { Phone, MessageCircle, Navigation, Globe, Instagram } from 'lucide-react';
import { getMergedContact } from '@/lib/utils';

interface ActionBarProps {
  shop: Shop;
}

export function ActionBar({ shop }: ActionBarProps) {
  const contact = getMergedContact(shop);

  // Prefer shop name and address for better navigation
  const destination = shop.address
    ? encodeURIComponent(`${shop.name}, ${shop.address}`)
    : shop.coordinates
      ? `${shop.coordinates.lat},${shop.coordinates.lng}`
      : shop.latitude && shop.longitude
        ? `${shop.latitude},${shop.longitude}`
        : null;

  const mapsUrl = destination
    ? `https://www.google.com/maps/dir/?api=1&destination=${destination}`
    : null;

  const hasAnyAction = contact.phone || mapsUrl || contact.website || contact.instagram;

  if (!hasAnyAction) return null;

  const hasPhone = Boolean(contact.phone);
  const hasLinks = Boolean(mapsUrl || contact.website || contact.instagram);

  return (
    <div className="space-y-3">
      {/* Phone actions - horizontal row */}
      {hasPhone && (
        <div className="flex gap-2">
          <Button
            as="a"
            href={`tel:${contact.phone}`}
            variant="flat"
            size="sm"
            startContent={<Phone className="w-4 h-4" />}
            className="bg-surface flex-1"
          >
            Call
          </Button>
          <Button
            as="a"
            href={`sms:${contact.phone}`}
            variant="flat"
            size="sm"
            startContent={<MessageCircle className="w-4 h-4" />}
            className="bg-surface flex-1"
          >
            Message
          </Button>
        </div>
      )}

      {/* Links - horizontal row with stacked icon/label */}
      {hasLinks && (
        <div className="flex gap-2">
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex flex-col items-center gap-1 py-3 px-2 bg-surface rounded-lg hover:bg-surfaceHover transition-colors"
            >
              <Navigation className="w-5 h-5 text-textSecondary" />
              <span className="text-xs text-text">Directions</span>
            </a>
          )}

          {contact.website && (
            <a
              href={contact.website.startsWith('http') ? contact.website : `https://${contact.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex flex-col items-center gap-1 py-3 px-2 bg-surface rounded-lg hover:bg-surfaceHover transition-colors"
            >
              <Globe className="w-5 h-5 text-textSecondary" />
              <span className="text-xs text-text">Website</span>
            </a>
          )}

          {contact.instagram && (
            <a
              href={`https://instagram.com/${contact.instagram.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex flex-col items-center gap-1 py-3 px-2 bg-surface rounded-lg hover:bg-surfaceHover transition-colors"
            >
              <Instagram className="w-5 h-5 text-textSecondary" />
              <span className="text-xs text-text">Instagram</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}
