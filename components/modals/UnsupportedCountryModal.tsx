'use client';

import { Modal, ModalContent, ModalHeader, ModalBody, Button } from '@heroui/react';
import { Globe } from 'lucide-react';

interface UnsupportedCountryModalProps {
  isOpen: boolean;
  countryName: string;
  onClose: () => void;
}

export function UnsupportedCountryModal({ isOpen, countryName, onClose }: UnsupportedCountryModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      backdrop="opaque"
      classNames={{
        backdrop: 'bg-black/50',
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1 pt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-accent" />
            </div>
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
      </ModalContent>
    </Modal>
  );
}
