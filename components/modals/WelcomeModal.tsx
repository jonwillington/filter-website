'use client';

import { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, Button } from '@heroui/react';
import { MapPin, Globe } from 'lucide-react';

interface WelcomeModalProps {
  onFindNearMe: () => void;
  onExplore: () => void;
}

const WELCOME_MODAL_SHOWN_KEY = 'filter-welcome-modal-shown';

export function WelcomeModal({ onFindNearMe, onExplore }: WelcomeModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if modal has been shown before
    const hasBeenShown = localStorage.getItem(WELCOME_MODAL_SHOWN_KEY);

    if (!hasBeenShown) {
      // Show modal after a brief delay for better UX
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = (action: 'nearMe' | 'explore') => {
    // Mark modal as shown
    localStorage.setItem(WELCOME_MODAL_SHOWN_KEY, 'true');
    setIsOpen(false);

    // Execute the appropriate action
    if (action === 'nearMe') {
      onFindNearMe();
    } else {
      onExplore();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}}
      size="md"
      backdrop="opaque"
      hideCloseButton
      classNames={{
        backdrop: 'bg-black/50',
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1 pt-6">
          <h2 className="text-2xl font-bold">Welcome to Filter</h2>
          <p className="text-sm font-normal text-gray-600">
            What would you like to do?
          </p>
        </ModalHeader>
        <ModalBody className="pb-6 pt-2">
          <div className="space-y-3">
            <Button
              fullWidth
              size="lg"
              startContent={<MapPin className="w-5 h-5" />}
              onPress={() => handleClose('nearMe')}
              className="bg-accent text-white font-semibold justify-start px-6 h-16"
            >
              <div className="flex flex-col items-start gap-0.5">
                <span>Find locations near me</span>
                <span className="text-xs font-normal opacity-90">
                  Discover coffee shops around you
                </span>
              </div>
            </Button>

            <Button
              fullWidth
              size="lg"
              variant="bordered"
              startContent={<Globe className="w-5 h-5" />}
              onPress={() => handleClose('explore')}
              className="justify-start px-6 h-16 border-2"
            >
              <div className="flex flex-col items-start gap-0.5">
                <span className="font-semibold">Explore</span>
                <span className="text-xs font-normal text-gray-600">
                  Browse all locations worldwide
                </span>
              </div>
            </Button>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
