'use client';

import { useState, useEffect } from 'react';
import { Award, X } from 'lucide-react';
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
        background: `linear-gradient(${135 + gradientPosition * 0.5}deg, #ffffff 0%, #f8f8f8 20%, #f5f5f5 80%, #eeeeee 100%)`,
      };

  const textColor = variant === 'default' ? 'text-white' : 'text-text';

  const content = (
    <div
      className={cn(
        'relative rounded-xl p-3 border border-black/10 overflow-hidden transition-all duration-300',
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

      <div className="flex items-center gap-1.5 mb-0.5">
        <Award size={14} className={textColor} />
        <h3 className={cn('font-medium text-sm', textColor)}>
          {title}
        </h3>
      </div>

      <div className="pr-16">
        <p className={cn('text-xs leading-snug', textColor, 'opacity-90')}>
          {displayMessage}
          {!message && (
            <span className="font-bold opacity-100"> Learn why</span>
          )}
        </p>
      </div>

      <div className="absolute bottom-0 right-0 w-[80px] h-[80px] pointer-events-none">
        <Image
          src="/coffee-award.png"
          alt="Award"
          width={80}
          height={80}
          className="w-full h-full object-contain"
        />
      </div>
    </div>
  );

  if (onPress) {
    return (
      <button
        onClick={onPress}
        className="w-full text-left rounded-xl mb-1 hover:opacity-95 transition-opacity"
      >
        {content}
      </button>
    );
  }

  return <div className="mb-1">{content}</div>;
}
