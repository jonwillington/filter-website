'use client';

import { Review } from '@/lib/types/auth';
import { Star, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ReviewCardProps {
  review: Review;
}

export function ReviewCard({ review }: ReviewCardProps) {
  const formatDate = (date: Date) => {
    try {
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={12}
            fill={star <= rating ? 'var(--accent)' : 'none'}
            stroke={star <= rating ? 'var(--accent)' : 'var(--border)'}
            strokeWidth={1.5}
          />
        ))}
      </div>
    );
  };

  return (
    <div
      className="p-4 rounded-lg"
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--border)' }}
          >
            <User size={16} style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              {review.userDisplayName || 'Anonymous'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {formatDate(review.createdAt)}
            </p>
          </div>
        </div>
        {review.overallRating > 0 && renderStars(review.overallRating)}
      </div>

      {/* Detail Ratings */}
      {(review.ratings.coffee > 0 || review.ratings.service > 0 || review.ratings.interior > 0) && (
        <div className="flex flex-wrap gap-3 mb-3">
          {review.ratings.coffee > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Coffee</span>
              {renderStars(review.ratings.coffee)}
            </div>
          )}
          {review.ratings.service > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Service</span>
              {renderStars(review.ratings.service)}
            </div>
          )}
          {review.ratings.interior > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Interior</span>
              {renderStars(review.ratings.interior)}
            </div>
          )}
        </div>
      )}

      {/* Comment */}
      {review.comment && (
        <p className="text-sm mb-3" style={{ color: 'var(--text)' }}>
          {review.comment}
        </p>
      )}

      {/* Tags */}
      {review.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
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
    </div>
  );
}
