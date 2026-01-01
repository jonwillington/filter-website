'use client';

import { Button } from '@heroui/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CircularCloseButtonProps {
  onPress: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  'aria-label'?: string;
}

export function CircularCloseButton({
  onPress,
  className,
  size = 'md',
  'aria-label': ariaLabel = 'Close',
}: CircularCloseButtonProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <Button
      isIconOnly
      variant="flat"
      onPress={onPress}
      aria-label={ariaLabel}
      className={cn(
        'rounded-full bg-white/90 backdrop-blur-sm hover:bg-white',
        'shadow-md transition-all duration-200',
        sizeClasses[size],
        className
      )}
    >
      <X className={iconSizes[size]} />
    </Button>
  );
}
