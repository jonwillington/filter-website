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
      classNames={{ content: 'font-mono' }}
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
const chipBase = 'bg-white dark:bg-white/10 border border-border-default h-[34px] min-w-[50px] px-2.5';
const chipContent = 'text-primary text-[11px] font-mono';

export const AmenityChip = ({ children, ...props }: Omit<StatusChipProps, 'status' | 'icon'>) => (
  <Chip variant="bordered" size="sm" radius="full" classNames={{ base: chipBase, content: chipContent }} {...props}>
    {children}
  </Chip>
);

/**
 * BrewMethodChip - Chip for displaying brew methods
 */
export const BrewMethodChip = ({ children, ...props }: Omit<StatusChipProps, 'status' | 'icon'>) => (
  <Chip variant="bordered" size="sm" radius="full" classNames={{ base: chipBase, content: chipContent }} {...props}>
    {children}
  </Chip>
);

/**
 * OwnRoastChip - Chip for indicating a brand roasts their own beans
 */
export const OwnRoastChip = ({ children = 'Own roast', ...props }: Omit<StatusChipProps, 'status' | 'icon' | 'children'> & { children?: ReactNode }) => (
  <Chip
    variant="flat"
    size="sm"
    radius="full"
    classNames={{
      base: 'bg-amber-50 dark:bg-amber-900/30 h-[34px] px-1.5',
      content: 'text-amber-700 dark:text-amber-300 text-[11px] font-medium font-mono pr-0',
    }}
    {...props}
  >
    {children}
  </Chip>
);

/**
 * ValueChip - Generic chip for displaying property values (equipment, awards, etc.)
 */
export const ValueChip = ({ children, ...props }: Omit<StatusChipProps, 'status' | 'icon'>) => (
  <Chip variant="bordered" size="sm" radius="full" classNames={{ base: chipBase, content: chipContent }} {...props}>
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
  `https://flagcdn.com/w40/${code.toLowerCase()}.png`;

export const CountryChip = ({ code, name }: CountryChipProps) => (
  <Chip
    variant="bordered"
    size="sm"
    radius="full"
    startContent={
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={getFlagUrl(code)}
        alt={name}
        className="w-3 h-3 rounded-full mr-1"
      />
    }
    classNames={{ base: `${chipBase} pl-2`, content: chipContent }}
  >
    {name}
  </Chip>
);
