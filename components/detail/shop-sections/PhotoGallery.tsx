'use client';

import { Shop } from '@/lib/types';
import { getMediaUrl } from '@/lib/utils';
import Image from 'next/image';
import { Divider } from '@heroui/react';

interface PhotoGalleryProps {
  shop: Shop;
}

export function PhotoGallery({ shop }: PhotoGalleryProps) {
  const featuredImage = getMediaUrl(shop.featured_image);
  const gallery = shop.gallery?.map((img) => getMediaUrl(img)).filter(Boolean) as string[] ?? [];

  if (!featuredImage && gallery.length === 0) return null;

  return (
    <>
      <Divider className="my-5 opacity-30" />
      <div>
      <h3 className="text-lg font-medium text-primary mb-3">
        Photos
      </h3>

      {featuredImage && (
        <div className="relative w-full h-48 rounded-lg overflow-hidden mb-2">
          <Image
            src={featuredImage}
            alt={shop.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 400px"
          />
        </div>
      )}

      {gallery.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {gallery.slice(0, 6).map((url, i) => (
            <div
              key={i}
              className="relative aspect-square rounded-lg overflow-hidden"
            >
              <Image
                src={url}
                alt={`${shop.name} photo ${i + 1}`}
                fill
                className="object-cover"
                sizes="120px"
              />
            </div>
          ))}
        </div>
      )}
    </div>
    </>
  );
}
