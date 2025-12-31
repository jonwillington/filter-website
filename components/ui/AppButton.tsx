import { Button, ButtonProps } from '@heroui/react';
import { ReactNode } from 'react';

/**
 * AppButton - A pre-configured Button component with app-specific defaults
 *
 * Features:
 * - Consistent sizing and variants
 * - Proper accessibility attributes
 * - Loading states
 * - Icon support
 *
 * @example
 * // Primary action button
 * <AppButton onPress={handleSave}>Save Changes</AppButton>
 *
 * // Icon-only button
 * <AppButton
 *   isIconOnly
 *   variant="light"
 *   aria-label="Close"
 * >
 *   <X className="w-5 h-5" />
 * </AppButton>
 *
 * // Link button
 * <AppButton
 *   as="a"
 *   href="https://example.com"
 *   target="_blank"
 *   variant="flat"
 * >
 *   Visit Website
 * </AppButton>
 */

interface AppButtonProps extends ButtonProps {
  /** Button content */
  children: ReactNode;
}

export function AppButton({
  variant = 'solid',
  color = 'primary',
  size = 'md',
  ...props
}: AppButtonProps) {
  return (
    <Button
      variant={variant}
      color={color}
      size={size}
      {...props}
    />
  );
}

/**
 * Pre-configured button variants for common use cases
 */

/** Primary action button - for main CTAs */
export const PrimaryButton = ({ ...props }: AppButtonProps) => (
  <AppButton color="primary" variant="solid" {...props} />
);

/** Secondary action button - for less prominent actions */
export const SecondaryButton = ({ ...props }: AppButtonProps) => (
  <AppButton color="default" variant="flat" {...props} />
);

/** Danger button - for destructive actions */
export const DangerButton = ({ ...props }: AppButtonProps) => (
  <AppButton color="danger" variant="solid" {...props} />
);

/** Icon-only button - for toolbar actions */
export const IconButton = ({
  'aria-label': ariaLabel,
  ...props
}: AppButtonProps & { 'aria-label': string }) => (
  <AppButton
    isIconOnly
    variant="light"
    aria-label={ariaLabel}
    {...props}
  />
);

/** Link button - renders as anchor tag */
export const LinkButton = ({
  href,
  target,
  ...props
}: AppButtonProps & { href: string; target?: string }) => (
  <AppButton
    as="a"
    href={href}
    target={target}
    rel={target === '_blank' ? 'noopener noreferrer' : undefined}
    variant="flat"
    {...props}
  />
);
