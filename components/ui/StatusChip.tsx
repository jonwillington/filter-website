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
export const AmenityChip = ({ children, ...props }: Omit<StatusChipProps, 'status' | 'icon'>) => (
  <Chip
    variant="solid"
    size="md"
    radius="full"
    classNames={{
      base: 'bg-gray-100 dark:bg-white/15 border-none',
      content: 'text-text text-xs',
    }}
    {...props}
  >
    {children}
  </Chip>
);

/**
 * BrewMethodChip - Chip for displaying brew methods
 */
export const BrewMethodChip = ({ children, ...props }: Omit<StatusChipProps, 'status' | 'icon'>) => (
  <Chip
    variant="solid"
    size="md"
    radius="full"
    classNames={{
      base: 'bg-gray-100 dark:bg-white/15 border-none',
      content: 'text-text text-xs font-medium',
    }}
    {...props}
  >
    {children}
  </Chip>
);

/**
 * CountryChip - Chip for displaying country with flag
 */
interface CountryChipProps {
  code: string;
  name: string;
}

const getFlagUrl = (code: string) =>
  `https://hatscripts.github.io/circle-flags/flags/${code.toLowerCase()}.svg`;

export const CountryChip = ({ code, name }: CountryChipProps) => (
  <Chip
    variant="solid"
    size="md"
    radius="full"
    startContent={
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={getFlagUrl(code)}
        alt={name}
        className="w-3 h-3 rounded-full"
      />
    }
    classNames={{
      base: 'bg-gray-100 dark:bg-white/15 border-none pl-3',
      content: 'text-text text-xs',
    }}
  >
    {name}
  </Chip>
);
