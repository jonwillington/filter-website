import { Shop } from '@/lib/types';
import { Button } from '@heroui/react';
import { Globe, Instagram, Navigation } from 'lucide-react';

interface SocialLinksProps {
  shop: Shop;
}

export function SocialLinks({ shop }: SocialLinksProps) {
  const hasLinks = shop.website || shop.instagram;
  const coords = shop.coordinates ?? (shop.latitude && shop.longitude ? { lat: shop.latitude, lng: shop.longitude } : null);

  if (!hasLinks && !coords) return null;

  const mapsUrl = shop.google_place_id
    ? `https://www.google.com/maps/dir/?api=1&destination_place_id=${shop.google_place_id}&travelmode=walking`
    : coords
      ? `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}&travelmode=walking`
      : null;

  return (
    <div>
      <h3 className="text-lg font-medium text-primary mb-3">
        Links
      </h3>
      <div className="flex flex-wrap gap-2">
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

        {shop.website && (
          <Button
            as="a"
            href={shop.website.startsWith('http') ? shop.website : `https://${shop.website}`}
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

        {shop.instagram && (
          <Button
            as="a"
            href={`https://instagram.com/${shop.instagram.replace('@', '')}`}
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
    </div>
  );
}
