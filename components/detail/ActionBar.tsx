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
  const coords = shop.coordinates ?? (shop.latitude && shop.longitude
    ? { lat: shop.latitude, lng: shop.longitude }
    : null);

  const mapsUrl = coords
    ? `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`
    : null;

  const hasAnyAction = contact.phone || mapsUrl || contact.website || contact.instagram;

  if (!hasAnyAction) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {contact.phone && (
        <Button
          as="a"
          href={`tel:${contact.phone}`}
          variant="flat"
          size="sm"
          startContent={<Phone className="w-4 h-4" />}
          className="bg-surface"
        >
          Call
        </Button>
      )}

      {contact.phone && (
        <Button
          as="a"
          href={`sms:${contact.phone}`}
          variant="flat"
          size="sm"
          startContent={<MessageCircle className="w-4 h-4" />}
          className="bg-surface"
        >
          Message
        </Button>
      )}

      {mapsUrl && (
        <Button
          as="a"
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          variant="flat"
          size="sm"
          startContent={<Navigation className="w-4 h-4" />}
          className="bg-accent text-white"
        >
          Directions
        </Button>
      )}

      {contact.website && (
        <Button
          as="a"
          href={contact.website.startsWith('http') ? contact.website : `https://${contact.website}`}
          target="_blank"
          rel="noopener noreferrer"
          variant="flat"
          size="sm"
          startContent={<Globe className="w-4 h-4" />}
          className="bg-surface"
        >
          Website
        </Button>
      )}

      {contact.instagram && (
        <Button
          as="a"
          href={`https://instagram.com/${contact.instagram.replace('@', '')}`}
          target="_blank"
          rel="noopener noreferrer"
          variant="flat"
          size="sm"
          startContent={<Instagram className="w-4 h-4" />}
          className="bg-surface"
        >
          Instagram
        </Button>
      )}
    </div>
  );
}
