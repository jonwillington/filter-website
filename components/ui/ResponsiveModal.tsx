'use client';

import { Modal, ModalContent } from '@heroui/react';
import { ReactNode } from 'react';

interface ResponsiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Optional classNames for the Modal component */
  modalClassNames?: {
    wrapper?: string;
    base?: string;
    backdrop?: string;
    header?: string;
    body?: string;
    footer?: string;
    closeButton?: string;
  };
  /** Size of the modal on desktop */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full';
  /** Backdrop type */
  backdrop?: 'transparent' | 'opaque' | 'blur';
  /** Hide close button */
  hideCloseButton?: boolean;
  /** Prevent closing on backdrop click */
  isDismissable?: boolean;
}

export function ResponsiveModal({
  isOpen,
  onClose,
  children,
  modalClassNames = {},
  size = 'md',
  backdrop = 'opaque',
  hideCloseButton = false,
  isDismissable = true,
}: ResponsiveModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={size}
      backdrop={backdrop}
      hideCloseButton={hideCloseButton}
      isDismissable={isDismissable}
      classNames={{
        ...modalClassNames,
        wrapper: `${modalClassNames.wrapper || ''} items-end lg:items-center`,
        base: `${modalClassNames.base || ''} m-0 mb-0 lg:m-6 rounded-t-2xl rounded-b-none lg:rounded-2xl max-h-[95vh]`,
      }}
    >
      <ModalContent className="relative">
        {/* Mobile drag handle - only visible on mobile */}
        <div className="lg:hidden flex-shrink-0 mx-auto w-12 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 my-4" />

        {children}
      </ModalContent>
    </Modal>
  );
}
