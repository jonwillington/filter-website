'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type BannerVariant = 'default' | 'light';

const variantStyles: Record<BannerVariant, { bg: string; gradient: string }> = {
  default: {
    bg: '#2E1F17',
    gradient: 'linear-gradient(135deg, #2E1F1788, #2E1F17bb, #2E1F17dd, #2E1F17f5)',
  },
  light: {
    bg: '#5D4A38',
    gradient: 'linear-gradient(135deg, #5D4A3888, #5D4A38aa, #5D4A38cc, #5D4A38ee)',
  },
};

interface ModalAnnouncementBannerProps {
  /** Banner text content */
  children: ReactNode;
  /** Optional leading icon (e.g., checkmark) */
  icon?: ReactNode;
  /** Visual variant - 'default' (dark) or 'light' */
  variant?: BannerVariant;
  /** Additional styling */
  className?: string;
}

/**
 * A curved banner that sits "behind" the modal content, peeking out at the top.
 * The modal content should overlap this with rounded-t corners and negative margin.
 * Used for announcements, promotions, or status messages.
 */
export function ModalAnnouncementBanner({
  children,
  icon,
  variant = 'default',
  className,
}: ModalAnnouncementBannerProps) {
  const styles = variantStyles[variant];

  return (
    <div style={{ backgroundColor: styles.bg }}>
      <div
        className={cn(
          'text-white px-6 pt-3 pb-6',
          'flex items-center justify-center gap-2',
          'text-sm font-medium text-center',
          className
        )}
        style={{
          background: styles.gradient,
        }}
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <span>{children}</span>
      </div>
    </div>
  );
}
