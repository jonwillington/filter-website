'use client';

import { useState } from 'react';
import { ModalHeader, ModalBody, Divider, ScrollShadow } from '@heroui/react';
import { SlidersHorizontal } from 'lucide-react';
import { ResponsiveModal } from '@/components/ui';
import { Toast } from '@/components/ui/Toast';
import { BrewMethodsSection } from '@/components/settings/BrewMethodsSection';
import { ShopTagsSection } from '@/components/settings/ShopTagsSection';
import { ShopFiltersSection } from '@/components/settings/ShopFiltersSection';

interface FilterPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FilterPreferencesModal({ isOpen, onClose }: FilterPreferencesModalProps) {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean } | null>(null);

  const handleSuccess = () => {
    // Close modal first
    onClose();
    // Show toast after modal closes
    setTimeout(() => {
      setToast({ message: 'Your settings have been updated', type: 'success', isVisible: true });
    }, 100);
  };

  const handleError = (msg: string) => {
    setToast({ message: msg, type: 'error', isVisible: true });
  };

  const hideToast = () => {
    setToast((prev) => prev ? { ...prev, isVisible: false } : null);
  };

  return (
    <>
      <ResponsiveModal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalHeader className="flex flex-col gap-1 pt-8 px-6">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            <span className="font-display text-2xl" style={{ color: 'var(--text)' }}>
              Filter Preferences
            </span>
          </div>
          <span className="text-sm font-normal" style={{ color: 'var(--text-secondary)' }}>
            Customize which shops we highlight for you
          </span>
        </ModalHeader>

        <ModalBody className="pb-8 px-6">
          <ScrollShadow className="space-y-6 max-h-[60vh] lg:max-h-[65vh]">
            <BrewMethodsSection
              onSuccess={handleSuccess}
              onError={handleError}
            />

            <Divider />

            <ShopTagsSection
              onSuccess={handleSuccess}
              onError={handleError}
            />

            <Divider />

            <ShopFiltersSection
              onSuccess={handleSuccess}
              onError={handleError}
            />
          </ScrollShadow>
        </ModalBody>
      </ResponsiveModal>

      {/* Toast renders outside modal so it persists after close */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={hideToast}
        />
      )}
    </>
  );
}
