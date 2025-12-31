'use client';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: number;
  animate?: boolean;
  animationDelay?: number;
}

export function StarRating({
  rating,
  maxRating = 5,
  size = 20,
  animate = false,
  animationDelay = 0,
}: StarRatingProps) {
  const stars = Array.from({ length: maxRating }, (_, index) => {
    const starNumber = index + 1;
    const fillPercentage = Math.min(Math.max(rating - index, 0), 1) * 100;

    return (
      <div
        key={index}
        className={`relative inline-block ${animate ? 'animate-star-pop' : ''}`}
        style={{
          width: size,
          height: size,
          animationDelay: animate ? `${animationDelay + index * 80}ms` : undefined,
          animationFillMode: animate ? 'both' : undefined,
        }}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute inset-0"
        >
          <defs>
            <linearGradient id={`star-gradient-${index}-${rating}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset={`${fillPercentage}%`} stopColor="#FFB800" />
              <stop offset={`${fillPercentage}%`} stopColor="transparent" />
            </linearGradient>
          </defs>
          {/* Background star (unfilled) */}
          <path
            d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
            stroke="#D1D5DB"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Filled star */}
          <path
            d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
            fill={`url(#star-gradient-${index}-${rating})`}
            stroke="#FFB800"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  });

  return <div className="inline-flex items-center gap-1">{stars}</div>;
}
