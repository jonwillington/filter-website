'use client';

import { Review } from '@/lib/types/auth';
import { Star, User, Pencil, Trash2, MapPin, Building2, Trophy } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@heroui/react';
import { useUserBadges, useUserPhoto } from '@/lib/hooks';
import { getUserInitials } from '@/lib/utils/userUtils';
import Image from 'next/image';

interface ReviewCardProps {
  review: Review;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ReviewCard({ review, onEdit, onDelete }: ReviewCardProps) {
  const { data: userBadges } = useUserBadges(review.userId);
  const userPhotoURL = useUserPhoto(review.userId);
  const userInitials = getUserInitials(review.userDisplayName);

  const formatDate = (date: Date) => {
    try {
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  const renderStars = (rating: number, size: number = 12) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={size}
            fill={star <= rating ? 'var(--accent)' : 'none'}
            stroke={star <= rating ? 'var(--accent)' : 'var(--border)'}
            strokeWidth={1.5}
          />
        ))}
      </div>
    );
  };

  // Format subratings as text with interpuncts
  const getSubratingsText = () => {
    const subratings = [];
    if (review.ratings.coffee > 0) {
      subratings.push(`Coffee ${review.ratings.coffee}/5`);
    }
    if (review.ratings.service > 0) {
      subratings.push(`Service ${review.ratings.service}/5`);
    }
    if (review.ratings.interior > 0) {
      subratings.push(`Interior ${review.ratings.interior}/5`);
    }
    return subratings.join(' · ');
  };

  const subratingsText = getSubratingsText();

  // Get the highest priority badge to display
  const getBadge = () => {
    if (!userBadges) return null;

    // Priority 1: City Area Badge
    if (userBadges.cityAreaBadges.length > 0) {
      const areaBadge = userBadges.cityAreaBadges[0];
      return (
        <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-surface border border-border-default">
          <MapPin size={12} className="text-accent" />
          <span className="text-primary">{areaBadge.cityAreaName} Guide</span>
        </div>
      );
    }

    // Priority 2: City Badge
    if (userBadges.cityBadges.length > 0) {
      const cityBadge = userBadges.cityBadges[0];
      return (
        <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-surface border border-border-default">
          <Building2 size={12} className="text-accent" />
          <span className="text-primary">{cityBadge.locationName} Guide</span>
        </div>
      );
    }

    // Priority 3: Top Contributor
    if (userBadges.topContributor.earned) {
      return (
        <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-surface border border-border-default">
          <Trophy size={12} className="text-accent" />
          <span className="text-primary">Top Contributor</span>
        </div>
      );
    }

    return null;
  };

  return (
    <div
      className="p-4 rounded-lg relative"
      style={{ backgroundColor: 'var(--surface)' }}
    >
      {/* Badge in top right - absolutely positioned */}
      <div className="absolute top-4 right-4">
        {getBadge()}
      </div>

      {/* Header - Avatar stacked above name */}
      <div className="mb-3">
        <div className="flex flex-col items-start">
          {/* Avatar */}
          <div className="mb-2">
            {userPhotoURL ? (
              <Image
                src={userPhotoURL}
                alt={review.userDisplayName || 'User'}
                width={48}
                height={48}
                className="rounded-full"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium"
                style={{ backgroundColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                {userInitials}
              </div>
            )}
          </div>

          {/* Name */}
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            {review.userDisplayName || 'Anonymous'}
          </p>
        </div>

        {/* Meta row - Date on left, Star rating on right */}
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            {formatDate(review.createdAt)}
          </p>
          {review.overallRating > 0 && renderStars(review.overallRating, 16)}
        </div>
      </div>

      {/* Comment */}
      {review.comment && (
        <p className="text-sm mb-2" style={{ color: 'var(--text)', lineHeight: '1.5' }}>
          {review.comment}
        </p>
      )}

      {/* Subratings as text with interpuncts */}
      {subratingsText && (
        <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
          {subratingsText}
        </p>
      )}

      {/* Tags */}
      {review.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {review.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-xs rounded-full"
              style={{
                backgroundColor: 'var(--background)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              {tag.charAt(0).toUpperCase() + tag.slice(1)}
            </span>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      {(onEdit || onDelete) && (
        <div className="flex gap-2 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          {onEdit && (
            <Button
              size="sm"
              variant="light"
              startContent={<Pencil className="w-3 h-3" />}
              onPress={onEdit}
            >
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              size="sm"
              variant="light"
              color="danger"
              startContent={<Trash2 className="w-3 h-3" />}
              onPress={onDelete}
            >
              Delete
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
