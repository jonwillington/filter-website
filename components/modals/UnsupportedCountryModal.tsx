'use client';

import { ModalHeader, ModalBody, Button } from '@heroui/react';
import Image from 'next/image';
import { ResponsiveModal } from '@/components/ui';

interface UnsupportedCountryModalProps {
  isOpen: boolean;
  countryName: string;
  countryCode?: string;
  onClose: () => void;
  /** 'coming-soon' for unsupported countries, 'no-shops' for supported countries with no shops */
  variant?: 'coming-soon' | 'no-shops';
}

export function UnsupportedCountryModal({
  isOpen,
  countryName,
  countryCode,
  onClose,
  variant = 'coming-soon',
}: UnsupportedCountryModalProps) {
  const flagUrl = countryCode
    ? `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`
    : null;

  const isNoShops = variant === 'no-shops';

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      backdrop="opaque"
      modalClassNames={{
        backdrop: 'bg-black/50',
      }}
    >
      <ModalHeader className="flex flex-col gap-1 pt-6">
          <div className="flex items-center gap-3">
            {flagUrl ? (
              <div className="w-12 h-12 rounded-full overflow-hidden bg-background shadow-md">
                <Image
                  src={flagUrl}
                  alt={countryName}
                  width={48}
                  height={48}
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-surface" />
            )}
            <h2 className="text-xl font-bold">
              {isNoShops ? 'No Recommendations Yet' : 'Coming Soon'}
            </h2>
          </div>
        </ModalHeader>
        <ModalBody className="pb-6 pt-2">
          <p className="text-text-secondary mb-4">
            {isNoShops ? (
              <>
                We haven&apos;t found any good specialty coffee shops in{' '}
                <span className="font-semibold text-primary">{countryName}</span> yet.
                Know of one? Let us know!
              </>
            ) : (
              <>
                Filter is not yet in{' '}
                <span className="font-semibold text-primary">{countryName}</span> but it is coming soon!
              </>
            )}
          </p>
          <Button
            fullWidth
            size="lg"
            onPress={onClose}
            className="bg-accent text-white font-semibold"
          >
            Got it
          </Button>
        </ModalBody>
    </ResponsiveModal>
  );
}
