'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Spinner,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@heroui/react';
import { useAuth } from '@/lib/context/AuthContext';
import { reviewsService } from '@/lib/services/reviewsService';
import { Review } from '@/lib/types/auth';
import { ReviewsList } from '@/components/reviews/ReviewsList';
import { ReviewModal } from '@/components/reviews/ReviewModal';
import { Toast, useToast } from '@/components/ui/Toast';
import { ArrowLeft } from 'lucide-react';

export default function ReviewsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const { toast, success, error: showError, hideToast } = useToast();

  const loadReviews = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const userReviews = await reviewsService.getUserReviews(user.uid);
      setReviews(userReviews);
    } catch (err) {
      console.error('Failed to load reviews:', err);
      showError('Failed to load reviews');
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, showError]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }

    if (user) {
      loadReviews();
    }
  }, [user, authLoading, router, loadReviews]);

  const handleDeleteReview = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await reviewsService.deleteReview(deleteTarget);
      setReviews((prev) => prev.filter((r) => r.id !== deleteTarget));
      success('Review deleted');
    } catch (err) {
      console.error('Failed to delete review:', err);
      showError('Failed to delete review');
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleEditSuccess = async () => {
    // Reload reviews to get updated data
    await loadReviews();
    setEditingReview(null);
    success('Review updated');
  };

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
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={hideToast}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        placement="center"
      >
        <ModalContent>
          <ModalHeader>Delete Review</ModalHeader>
          <ModalBody>
            <p style={{ color: 'var(--text)' }}>
              Are you sure you want to delete this review? This action cannot be undone.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="flat"
              onPress={() => setDeleteTarget(null)}
              isDisabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              color="danger"
              onPress={handleDeleteReview}
              isLoading={isDeleting}
            >
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Review Modal */}
      {editingReview && (
        <ReviewModal
          isOpen={!!editingReview}
          onClose={() => setEditingReview(null)}
          shopId={editingReview.shopId}
          shopName={editingReview.shopName}
          onSuccess={handleEditSuccess}
          existingReview={{
            id: editingReview.id,
            overallRating: editingReview.overallRating,
            ratings: editingReview.ratings,
            tags: editingReview.tags,
            comment: editingReview.comment,
          }}
        />
      )}

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
        <ReviewsList
          reviews={reviews}
          isLoading={isLoading}
          showShopName
          emptyMessage="No reviews yet"
          emptyAction={{
            label: 'Explore Shops',
            onPress: () => router.push('/'),
          }}
          onEditReview={(review) => setEditingReview(review)}
          onDeleteReview={(reviewId) => setDeleteTarget(reviewId)}
        />
      </div>
    </div>
  );
}
