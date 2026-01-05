'use client';

import { useState, useEffect, useCallback } from 'react';
import { ModalBody } from '@heroui/react';
import { ResponsiveModal } from '@/components/ui';
import { UserImage } from '@/lib/types';
import { getMediaUrl } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';

interface UserPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: UserImage[];
  initialIndex: number;
}

function formatUploadDate(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleDateString('en-GB', { month: 'long' });
  const year = date.getFullYear();

  const getOrdinalSuffix = (d: number) => {
    if (d > 3 && d < 21) return 'th';
    switch (d % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  return `${day}${getOrdinalSuffix(day)} ${month} ${year}`;
}

function getEmailInitial(email: string | undefined): string {
  if (!email) return '?';
  return email.charAt(0).toUpperCase();
}

export function UserPhotoModal({
  isOpen,
  onClose,
  images,
  initialIndex,
}: UserPhotoModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
    }
  }, [isOpen, initialIndex]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, goToPrevious, goToNext, onClose]);

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex] || images[0];
  const imageUrl = currentImage.image?.url ? getMediaUrl(currentImage.image) : null;
  const userEmail = currentImage.userEmail;
  const avatarUrl = currentImage.avatarUrl;
  const uploadDate = currentImage.createdAt ? formatUploadDate(currentImage.createdAt) : null;

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      modalClassNames={{
        backdrop: 'bg-black/80 backdrop-blur-sm',
        base: 'bg-background max-h-[95vh]',
      }}
    >
      {/* Header with user info */}
      <div className="sticky top-0 z-10 bg-background border-b border-border-default">
        <div className="px-6 py-4 flex items-center gap-3">
          {/* User Avatar */}
          <div className="w-10 h-10 rounded-full bg-surface border border-border-default flex items-center justify-center overflow-hidden flex-shrink-0">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt="User avatar"
                width={40}
                height={40}
                className="object-cover"
              />
            ) : (
              <span className="text-sm font-medium text-textSecondary">
                {getEmailInitial(userEmail)}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-primary truncate">
              {userEmail || 'Anonymous'}
            </p>
            {uploadDate && (
              <p className="text-xs text-textSecondary">{uploadDate}</p>
            )}
          </div>
        </div>
      </div>

      <ModalBody className="p-0 relative">
        {/* Image container */}
        <div className="relative w-full aspect-square lg:aspect-video bg-surface flex items-center justify-center">
          {imageUrl && (
            <Image
              src={imageUrl}
              alt={`User photo ${currentIndex + 1}`}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 80vw"
              priority
            />
          )}

          {/* Navigation arrows (desktop only, when multiple images) */}
          {images.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white items-center justify-center transition-colors hidden lg:flex"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white items-center justify-center transition-colors hidden lg:flex"
                aria-label="Next image"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Photo counter */}
          {images.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2">
              <div className="px-4 py-2 rounded-full bg-black/70 text-white text-sm font-medium">
                {currentIndex + 1} / {images.length}
              </div>
            </div>
          )}
        </div>

        {/* Dot indicators for mobile */}
        {images.length > 1 && (
          <div className="flex justify-center gap-1.5 py-4 lg:hidden">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex
                    ? 'bg-accent'
                    : 'bg-gray-300 dark:bg-white/20'
                }`}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        )}
      </ModalBody>
    </ResponsiveModal>
  );
}
