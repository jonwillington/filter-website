'use client';

import { UserImage } from '@/lib/types';
import { getMediaUrl } from '@/lib/utils';
import Image from 'next/image';
import { Divider } from '@heroui/react';

interface UserPhotosSectionProps {
  images: UserImage[];
  onPhotoPress: (image: UserImage, index: number) => void;
  loading?: boolean;
}

const PHOTO_SIZE = 100;

export function UserPhotosSection({
  images,
  onPhotoPress,
  loading = false,
}: UserPhotosSectionProps) {
  // Filter to only images with valid URLs
  const validImages = (images || []).filter(image => image.image?.url);

  if (loading || validImages.length === 0) {
    return null;
  }

  return (
    <>
      <Divider className="my-5 opacity-30" />
      <div>
        <h3 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-3">
          User photos
        </h3>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
          {validImages.map((image, index) => {
            const imageUrl = getMediaUrl(image.image);

            return (
              <button
                key={image.documentId || image.id}
                onClick={() => onPhotoPress(image, index)}
                className="relative flex-shrink-0 rounded-xl overflow-hidden group focus:outline-none focus:ring-2 focus:ring-accent"
                style={{ width: PHOTO_SIZE, height: PHOTO_SIZE }}
              >
                <Image
                  src={imageUrl!}
                  alt={`User photo ${index + 1}`}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                  sizes="100px"
                />
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
