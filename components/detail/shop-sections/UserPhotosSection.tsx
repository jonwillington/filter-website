'use client';

import { UserImage } from '@/lib/types';
import { getMediaUrl } from '@/lib/utils';
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
  // Debug: log the structure of first image
  console.log('UserPhotosSection first image:', JSON.stringify(images?.[0], null, 2));

  // Get URL from image object - handle different structures
  const getImageUrl = (img: UserImage): string | null => {
    // Try different possible locations for the URL
    const imageData = img.image as any;
    if (imageData?.url) return imageData.url;
    if (imageData?.formats?.small?.url) return imageData.formats.small.url;
    if (imageData?.formats?.thumbnail?.url) return imageData.formats.thumbnail.url;
    if ((img as any).url) return (img as any).url;
    return null;
  };

  // Filter to only images with valid URLs
  const validImages = (images || []).filter(img => !!getImageUrl(img));

  if (loading || validImages.length === 0) {
    return null;
  }

  return (
    <>
      <Divider className="my-5 opacity-30" />
      <div>
        <h3 className="text-lg font-medium text-primary mb-3">
          User photos
        </h3>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
          {validImages.map((image, index) => {
            const imageUrl = getImageUrl(image);

            return (
              <button
                key={image.documentId || image.id}
                onClick={() => onPhotoPress(image, index)}
                className="relative flex-shrink-0 rounded-xl overflow-hidden group focus:outline-none focus:ring-2 focus:ring-accent"
                style={{ width: PHOTO_SIZE, height: PHOTO_SIZE }}
              >
                <img
                  src={imageUrl!}
                  alt={`User photo ${index + 1}`}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
