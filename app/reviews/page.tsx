'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Spinner } from '@heroui/react';
import { useAuth } from '@/lib/context/AuthContext';
import { reviewsService } from '@/lib/services/reviewsService';
import { Review } from '@/lib/types/auth';
import { ReviewCard } from '@/components/reviews/ReviewCard';
import { ArrowLeft, MessageSquare } from 'lucide-react';

export default function ReviewsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadReviews = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const userReviews = await reviewsService.getUserReviews(user.uid);
      setReviews(userReviews);
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }

    if (user) {
      loadReviews();
    }
  }, [user, authLoading, router, loadReviews]);

  if (authLoading || !user) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--background)' }}
      >
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--background)', paddingBottom: '80px' }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 backdrop-blur-md"
        style={{
          backgroundColor: 'rgba(var(--background), 0.95)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            isIconOnly
            variant="light"
            onPress={() => router.back()}
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
            My Reviews
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : reviews.length > 0 ? (
          <div className="space-y-4">
            <p style={{ color: 'var(--text-secondary)' }}>
              You&apos;ve written {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
            </p>
            {reviews.map((review) => (
              <div key={review.id} className="space-y-2">
                <p className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
                  {review.shopName}
                </p>
                <ReviewCard review={review} />
              </div>
            ))}
          </div>
        ) : (
          <div
            className="text-center py-16 rounded-lg"
            style={{ backgroundColor: 'var(--surface)' }}
          >
            <MessageSquare className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-secondary)' }} />
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>
              No reviews yet
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Visit a coffee shop and share your experience!
            </p>
            <Button
              color="primary"
              variant="flat"
              className="mt-4"
              onPress={() => router.push('/')}
            >
              Explore Shops
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
