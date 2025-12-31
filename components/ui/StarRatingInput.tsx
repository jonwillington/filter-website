'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingInputProps {
  value: number;
  onChange: (value: number) => void;
  maxStars?: number;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  disabled?: boolean;
}

const sizeMap = {
  sm: { star: 20, gap: 2 },
  md: { star: 28, gap: 4 },
  lg: { star: 36, gap: 6 },
};

export function StarRatingInput({
  value,
  onChange,
  maxStars = 5,
  size = 'md',
  label,
  disabled = false,
}: StarRatingInputProps) {
  const [hoverValue, setHoverValue] = useState(0);
  const { star: starSize, gap } = sizeMap[size];

  const handleClick = (starValue: number) => {
    if (disabled) return;
    // Toggle off if clicking the same value
    const newValue = starValue === value ? starValue - 1 : starValue;
    onChange(Math.max(0, newValue));
  };

  const displayValue = hoverValue || value;

  return (
    <div className="flex items-center" style={{ gap: label ? 12 : 0 }}>
      {label && (
        <span
          className="text-sm font-medium min-w-[70px]"
          style={{ color: 'var(--text)' }}
        >
          {label}
        </span>
      )}
      <div
        className="flex items-center"
        style={{ gap }}
        onMouseLeave={() => setHoverValue(0)}
      >
        {Array.from({ length: maxStars }, (_, i) => i + 1).map((starValue) => {
          const isFilled = starValue <= displayValue;

          return (
            <button
              key={starValue}
              type="button"
              onClick={() => handleClick(starValue)}
              onMouseEnter={() => !disabled && setHoverValue(starValue)}
              disabled={disabled}
              className={`
                transition-transform duration-100
                ${disabled ? 'cursor-default' : 'cursor-pointer hover:scale-110'}
                focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded
              `}
              style={{ color: isFilled ? 'var(--accent)' : 'var(--border)' }}
              aria-label={`Rate ${starValue} out of ${maxStars}`}
            >
              <Star
                size={starSize}
                fill={isFilled ? 'currentColor' : 'none'}
                strokeWidth={1.5}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
