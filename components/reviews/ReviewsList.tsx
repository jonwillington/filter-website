'use client';

import { Review } from '@/lib/types/auth';
import { ReviewCard } from './ReviewCard';
import { MessageSquare } from 'lucide-react';
import { Button, Spinner } from '@heroui/react';

interface ReviewsListProps {
  reviews: Review[];
  isLoading?: boolean;
  showShopName?: boolean;
  emptyMessage?: string;
  emptyAction?: {
    label: string;
    onPress: () => void;
  };
  onEditReview?: (review: Review) => void;
  onDeleteReview?: (reviewId: string) => void;
}

export function ReviewsList({
  reviews,
  isLoading = false,
  showShopName = false,
  emptyMessage = 'No reviews yet',
  emptyAction,
  onEditReview,
  onDeleteReview,
}: ReviewsListProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div
        className="text-center py-16 rounded-lg"
        style={{ backgroundColor: 'var(--surface)' }}
      >
        <MessageSquare
          className="w-16 h-16 mx-auto mb-4"
          style={{ color: 'var(--text-secondary)' }}
        />
        <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>
          {emptyMessage}
        </h2>
        {emptyAction && (
          <Button
            color="primary"
            variant="flat"
            className="mt-4"
            onPress={emptyAction.onPress}
          >
            {emptyAction.label}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p style={{ color: 'var(--text-secondary)' }}>
        {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
      </p>
      {reviews.map((review) => (
        <div key={review.id} className="space-y-2">
          {showShopName && (
            <p className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
              {review.shopName}
            </p>
          )}
          <ReviewCard
            review={review}
            onEdit={onEditReview ? () => onEditReview(review) : undefined}
            onDelete={onDeleteReview ? () => onDeleteReview(review.id) : undefined}
          />
        </div>
      ))}
    </div>
  );
}
