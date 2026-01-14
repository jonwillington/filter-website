'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button, Spinner, Divider } from '@heroui/react';
import Image from 'next/image';
import { useAuth } from '@/lib/context/AuthContext';
import { reviewsService } from '@/lib/services/reviewsService';
import { Review } from '@/lib/types/auth';
import { Shop } from '@/lib/types';
import { ReviewCard } from '@/components/reviews/ReviewCard';
import { ReviewModal } from '@/components/reviews/ReviewModal';
import { MessageSquarePlus, Star } from 'lucide-react';

interface ShopReviewsSectionProps {
  shop: Shop;
  onOpenLoginModal?: () => void;
}

export function ShopReviewsSection({ shop, onOpenLoginModal }: ShopReviewsSectionProps) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadReviews = useCallback(async () => {
    try {
      const shopReviews = await reviewsService.getShopReviews(shop.documentId, shop.name);
      setReviews(shopReviews);
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setIsLoading(false);
    }
  }, [shop.documentId, shop.name]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleWriteReview = () => {
    if (!user) {
      onOpenLoginModal?.();
      return;
    }
    setIsModalOpen(true);
  };

  const handleReviewSuccess = () => {
    loadReviews();
  };

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + (r.overallRating || 0), 0) / reviews.filter(r => r.overallRating > 0).length
    : 0;

  const locationData = {
    cityAreaId: shop.city_area?.documentId || shop.cityArea?.documentId,
    cityAreaName: shop.city_area?.name || shop.cityArea?.name,
    locationId: shop.location?.documentId,
    locationName: shop.location?.name,
  };

  return (
    <>
      <Divider className="my-5 opacity-30" />
      <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium text-primary">
          Reviews
        </h3>
        <Button
          size="sm"
          variant="flat"
          className="bg-surface-elevated border border-border-default hover:bg-border-default"
          startContent={<MessageSquarePlus className="w-4 h-4" />}
          onPress={handleWriteReview}
        >
          Write Review
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner size="sm" />
        </div>
      ) : reviews.length > 0 ? (
        <div className="space-y-4">
          {/* Summary */}
          {averageRating > 0 && (
            <div className="flex items-center gap-2 pb-2">
              <Star className="w-5 h-5" style={{ color: 'var(--accent)', fill: 'var(--accent)' }} />
              <span className="font-semibold" style={{ color: 'var(--text)' }}>
                {averageRating.toFixed(1)}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>
                ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
              </span>
            </div>
          )}

          {/* Review Cards */}
          {reviews.slice(0, 5).map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}

          {reviews.length > 5 && (
            <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
              +{reviews.length - 5} more reviews
            </p>
          )}
        </div>
      ) : (
        <div className="text-center py-8 rounded-lg border border-gray-200 dark:border-white/10">
          <Image
            src="/empty_beans.png"
            alt="Coffee beans illustration"
            width={140}
            height={93}
            className="mx-auto mb-4 opacity-80"
          />
          <p className="font-medium" style={{ color: 'var(--text)' }}>
            No reviews yet
          </p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Be the first to share your experience
          </p>
        </div>
      )}

      <ReviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        shopId={shop.documentId}
        shopName={shop.name}
        publicTags={shop.public_tags}
        locationData={locationData}
        onSuccess={handleReviewSuccess}
      />
    </div>
    </>
  );
}
