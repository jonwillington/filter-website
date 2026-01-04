'use client';

import { ModalHeader, ModalBody, Button } from '@heroui/react';
import { MapPinOff, Settings } from 'lucide-react';
import { ResponsiveModal } from '@/components/ui';

interface LocationBlockedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LocationBlockedModal({ isOpen, onClose }: LocationBlockedModalProps) {
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
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <MapPinOff className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-bold">Location Blocked</h2>
        </div>
      </ModalHeader>
      <ModalBody className="pb-6 pt-2">
        <p className="text-text-secondary mb-4">
          Location permission has been blocked. To use the "Find Near Me" feature, you'll need to enable location access in your browser settings.
        </p>

        <div className="bg-surface rounded-lg p-4 mb-4">
          <p className="text-sm font-medium text-primary mb-2 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            How to enable location:
          </p>
          <ol className="text-sm text-text-secondary space-y-2 list-decimal list-inside">
            <li>Click the <span className="font-medium text-primary">tune icon</span> (or lock icon) next to the URL</li>
            <li>Find <span className="font-medium text-primary">Location</span> in the permissions list</li>
            <li>Change it from "Block" to "Allow"</li>
            <li>Refresh the page and try again</li>
          </ol>
        </div>

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
