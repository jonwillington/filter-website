import { Chip, ChipProps } from '@heroui/react';
import { ReactNode } from 'react';

/**
 * StatusChip - A standardized chip component for displaying status indicators
 *
 * @example
 * // Open/Closed status
 * <StatusChip status="success">Open</StatusChip>
 * <StatusChip status="danger">Closed</StatusChip>
 *
 * // With custom icon
 * <StatusChip status="warning" icon={<Coffee className="w-3 h-3" />}>
 *   Limited Menu
 * </StatusChip>
 */

export type StatusType = 'success' | 'warning' | 'danger' | 'default' | 'primary' | 'secondary';

interface StatusChipProps extends Omit<ChipProps, 'color' | 'variant'> {
  /** The status type which determines the color */
  status?: StatusType;
  /** Optional icon to display before the text */
  icon?: ReactNode;
  /** Children content */
  children: ReactNode;
  /** Chip variant - defaults to 'flat' */
  variant?: ChipProps['variant'];
}

export function StatusChip({
  status = 'default',
  icon,
  children,
  variant = 'flat',
  size = 'sm',
  ...props
}: StatusChipProps) {
  return (
    <Chip
      color={status}
      variant={variant}
      size={size}
      startContent={icon}
      {...props}
    >
      {children}
    </Chip>
  );
}

/**
 * Pre-configured status chips for common use cases
 */
export const OpenChip = ({ children = 'Open', ...props }: Omit<StatusChipProps, 'status'>) => (
  <StatusChip status="success" {...props}>{children}</StatusChip>
);

export const ClosedChip = ({ children = 'Closed', ...props }: Omit<StatusChipProps, 'status'>) => (
  <StatusChip status="danger" {...props}>{children}</StatusChip>
);

export const ComingSoonChip = ({ children = 'Coming Soon', ...props }: Omit<StatusChipProps, 'status'>) => (
  <StatusChip status="warning" {...props}>{children}</StatusChip>
);

/**
 * AmenityChip - Chip for displaying shop amenities
 */
export const AmenityChip = ({ children, icon, ...props }: Omit<StatusChipProps, 'status'>) => (
  <Chip
    variant="flat"
    size="sm"
    color="default"
    startContent={icon}
    classNames={{
      base: 'bg-surface border border-border',
      content: 'text-text text-xs',
    }}
    {...props}
  >
    {children}
  </Chip>
);

/**
 * BrewMethodChip - Chip for displaying brew methods with coffee accent
 */
export const BrewMethodChip = ({ children, icon, ...props }: Omit<StatusChipProps, 'status'>) => (
  <Chip
    variant="flat"
    size="sm"
    color="primary"
    startContent={icon}
    classNames={{
      base: 'bg-accent/10 border border-accent/20',
      content: 'text-accent text-xs font-medium',
    }}
    {...props}
  >
    {children}
  </Chip>
);
