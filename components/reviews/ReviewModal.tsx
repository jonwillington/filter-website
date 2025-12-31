'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Textarea,
  Chip,
} from '@heroui/react';
import { useAuth } from '@/lib/context/AuthContext';
import { reviewsService } from '@/lib/services/reviewsService';
import { StarRatingInput } from '@/components/ui/StarRatingInput';
import { Check } from 'lucide-react';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
  shopName: string;
  publicTags?: string[];
  locationData?: {
    cityAreaId?: string;
    cityAreaName?: string;
    locationId?: string;
    locationName?: string;
  };
  onSuccess?: () => void;
  existingReview?: {
    id: string;
    overallRating: number;
    ratings: { coffee: number; service: number; interior: number };
    tags: string[];
    comment: string | null;
  };
}

const ratingCategories = ['Coffee', 'Service', 'Interior'] as const;
type RatingCategory = (typeof ratingCategories)[number];

export function ReviewModal({
  isOpen,
  onClose,
  shopId,
  shopName,
  publicTags = [],
  locationData,
  onSuccess,
  existingReview,
}: ReviewModalProps) {
  const isEditMode = !!existingReview;
  const { user, userProfile } = useAuth();

  const [overallRating, setOverallRating] = useState(0);
  const [ratings, setRatings] = useState<Record<RatingCategory, number>>({
    Coffee: 0,
    Service: 0,
    Interior: 0,
  });
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetailRatings, setShowDetailRatings] = useState(false);

  // Reset/prefill form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (existingReview) {
        // Edit mode: prefill with existing values
        setOverallRating(existingReview.overallRating);
        setRatings({
          Coffee: existingReview.ratings.coffee,
          Service: existingReview.ratings.service,
          Interior: existingReview.ratings.interior,
        });
        setSelectedTags(new Set(existingReview.tags));
        setComment(existingReview.comment || '');
        setShowDetailRatings(existingReview.overallRating > 0);
      } else {
        // Create mode: reset form
        setOverallRating(0);
        setRatings({ Coffee: 0, Service: 0, Interior: 0 });
        setSelectedTags(new Set());
        setComment('');
        setShowDetailRatings(false);
      }
      setShowSuccess(false);
      setError(null);
    }
  }, [isOpen, existingReview]);

  // Show detail ratings when overall rating is set
  useEffect(() => {
    if (overallRating > 0 && !showDetailRatings) {
      setShowDetailRatings(true);
    } else if (overallRating === 0) {
      setShowDetailRatings(false);
    }
  }, [overallRating, showDetailRatings]);

  const handleTagToggle = useCallback((tag: string) => {
    setSelectedTags((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(tag)) {
        newSet.delete(tag);
      } else {
        newSet.add(tag);
      }
      return newSet;
    });
    setError(null);
  }, []);

  const handleRatingChange = useCallback((category: RatingCategory, value: number) => {
    setRatings((prev) => ({ ...prev, [category]: value }));
    setError(null);
  }, []);

  const hasSelections =
    overallRating > 0 ||
    ratingCategories.some((cat) => ratings[cat] > 0) ||
    selectedTags.size > 0 ||
    comment.trim().length > 0;

  const handleSubmit = async () => {
    if (!user || !userProfile) {
      setError('Please sign in to submit a review');
      return;
    }

    if (!hasSelections) {
      setError('Please add a rating, tag, or comment');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditMode && existingReview) {
        // Update existing review
        await reviewsService.updateReview(
          existingReview.id,
          overallRating,
          {
            coffee: ratings.Coffee,
            service: ratings.Service,
            interior: ratings.Interior,
          },
          Array.from(selectedTags),
          comment.trim() || null
        );
      } else {
        // Create new review
        await reviewsService.createReview(
          shopId,
          shopName,
          user.uid,
          userProfile.displayName,
          overallRating,
          {
            coffee: ratings.Coffee,
            service: ratings.Service,
            interior: ratings.Interior,
          },
          Array.from(selectedTags),
          comment.trim() || null,
          locationData
        );
      }

      setShowSuccess(true);
      onSuccess?.();

      // Auto-close after success
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Failed to submit review:', err);
      setError(isEditMode ? 'Failed to update review. Please try again.' : 'Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const capitalizeTag = (tag: string) => {
    if (!tag) return '';
    return tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      placement="center"
      size="lg"
      scrollBehavior="inside"
    >
      <ModalContent>
        {showSuccess ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: 'var(--success)' }}
            >
              <Check className="w-10 h-10 text-white" />
            </div>
            <h3
              className="text-xl font-semibold mb-2"
              style={{ color: 'var(--text)' }}
            >
              {isEditMode ? 'Updated!' : 'Thanks!'}
            </h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              {isEditMode ? 'Your review has been updated.' : 'Your feedback was submitted.'}
            </p>
          </div>
        ) : (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <span>{isEditMode ? `Edit review for ${shopName}` : `How was ${shopName}?`}</span>
            </ModalHeader>
            <ModalBody className="gap-6">
              {/* Overall Rating */}
              <div>
                <StarRatingInput
                  value={overallRating}
                  onChange={(v) => {
                    setOverallRating(v);
                    setError(null);
                  }}
                  size="lg"
                />
              </div>

              {/* Detail Ratings */}
              {showDetailRatings && (
                <div
                  className="space-y-3 animate-fade-in"
                  style={{
                    animation: 'fadeIn 0.3s ease-out',
                  }}
                >
                  {ratingCategories.map((category) => (
                    <div key={category} className="flex items-center justify-between">
                      <span
                        className="text-sm font-medium"
                        style={{ color: 'var(--text)' }}
                      >
                        {category}
                      </span>
                      <StarRatingInput
                        value={ratings[category]}
                        onChange={(v) => handleRatingChange(category, v)}
                        size="sm"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Comment */}
              {showDetailRatings && (
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: 'var(--text)' }}
                  >
                    Share anything specific?
                  </label>
                  <Textarea
                    value={comment}
                    onChange={(e) => {
                      setComment(e.target.value);
                      setError(null);
                    }}
                    placeholder="Add a quick note about your visit"
                    maxLength={500}
                    minRows={3}
                  />
                  <p
                    className="text-xs mt-1 text-right"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {comment.length}/500
                  </p>
                </div>
              )}

              {/* Tags */}
              {showDetailRatings && publicTags.length > 0 && (
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Did you like any of these?
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {publicTags.map((tag) => {
                      const isSelected = selectedTags.has(tag);
                      return (
                        <Chip
                          key={tag}
                          variant={isSelected ? 'solid' : 'bordered'}
                          color={isSelected ? 'primary' : 'default'}
                          className="cursor-pointer"
                          onClick={() => handleTagToggle(tag)}
                        >
                          {capitalizeTag(tag)}
                        </Chip>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <p className="text-sm" style={{ color: 'var(--error)' }}>
                  {error}
                </p>
              )}
            </ModalBody>
            <ModalFooter className="flex-col gap-2">
              <Button
                color="primary"
                className="w-full"
                onPress={handleSubmit}
                isLoading={isSubmitting}
                isDisabled={!hasSelections}
              >
                {isEditMode ? 'Update Review' : 'Submit'}
              </Button>
              <p
                className="text-xs text-center"
                style={{ color: 'var(--text-secondary)' }}
              >
                Reviews help Filter users find great coffee spots
              </p>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
