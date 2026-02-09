'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface AwardBoxProps {
  title: string;
  message?: string;
  onPress?: () => void;
  dismissible?: boolean;
  onDismiss?: () => void;
  variant?: 'default' | 'neutral';
}

export function AwardBox({
  title,
  message,
  onPress,
  dismissible = false,
  onDismiss,
  variant = 'default',
}: AwardBoxProps) {
  const [gradientPosition, setGradientPosition] = useState(0);

  // Animate gradient
  useEffect(() => {
    const interval = setInterval(() => {
      setGradientPosition((prev) => (prev + 1) % 200);
    }, 30);
    return () => clearInterval(interval);
  }, []);

  const genericMessage = "This shop has been recognized for exceptional quality. We recommend it as a top choice here.";
  const displayMessage = message || genericMessage;

  const gradientStyle = variant === 'default'
    ? {
        background: `linear-gradient(${135 + gradientPosition * 0.5}deg, rgba(46, 31, 23, 0.87) 0%, rgba(46, 31, 23, 0.94) 20%, rgba(46, 31, 23, 1) 80%, rgba(46, 31, 23, 0.91) 100%)`,
      }
    : {
        background: `linear-gradient(${135 + gradientPosition * 0.5}deg, #EFE8E2 0%, #E8E0D8 20%, #EDE5DE 80%, #E5DDD6 100%)`,
      };

  const textColor = variant === 'default' ? 'text-white' : 'text-primary';

  const content = (
    <div
      className={cn(
        'relative flex items-center overflow-hidden transition-all duration-300',
        dismissible && 'pr-10'
      )}
      style={gradientStyle}
    >
      {dismissible && onDismiss && (
        <button
          onClick={onDismiss}
          className={cn(
            'absolute top-1.5 right-1.5 z-10 p-1 rounded-full hover:bg-white/10 transition-colors',
            textColor
          )}
        >
          <X size={18} />
        </button>
      )}

      <div className="flex-shrink-0 w-[96px] relative self-stretch">
        <Image
          src="/coffee-award.png"
          alt="Award"
          width={120}
          height={120}
          className="absolute -top-7 -bottom-7 left-2 w-[140px] h-[calc(100%+56px)] object-contain"
        />
      </div>

      <div className="flex-1 min-w-0 py-2.5 pr-4">
        <h3 className={cn('font-semibold text-sm mb-1', textColor)}>
          {title}
        </h3>
        <p className={cn('text-[11px] leading-tight', textColor, 'opacity-60')}>
          {displayMessage}
          {!message && (
            <span className="font-bold opacity-100"> Learn why</span>
          )}
        </p>
      </div>
    </div>
  );

  if (onPress) {
    return (
      <button
        onClick={onPress}
        className="w-full text-left hover:opacity-95 transition-opacity"
      >
        {content}
      </button>
    );
  }

  return <div>{content}</div>;
}
