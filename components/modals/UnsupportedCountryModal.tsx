'use client';

import { ModalHeader, ModalBody, Button } from '@heroui/react';
import Image from 'next/image';
import { ResponsiveModal } from '@/components/ui';

interface UnsupportedCountryModalProps {
  isOpen: boolean;
  countryName: string;
  countryCode?: string;
  onClose: () => void;
}

export function UnsupportedCountryModal({ isOpen, countryName, countryCode, onClose }: UnsupportedCountryModalProps) {
  const flagUrl = countryCode
    ? `https://hatscripts.github.io/circle-flags/flags/${countryCode.toLowerCase()}.svg`
    : null;

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
              <div className="w-12 h-12 rounded-full overflow-hidden bg-white shadow-md">
                <Image
                  src={flagUrl}
                  alt={countryName}
                  width={48}
                  height={48}
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-200" />
            )}
            <h2 className="text-xl font-bold">Coming Soon</h2>
          </div>
        </ModalHeader>
        <ModalBody className="pb-6 pt-2">
          <p className="text-gray-600 mb-4">
            Filter is not yet in <span className="font-semibold text-gray-900">{countryName}</span> but it is coming soon!
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
