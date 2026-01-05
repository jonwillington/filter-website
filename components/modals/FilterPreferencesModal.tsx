'use client';

import { useState, useEffect } from 'react';
import { ModalHeader, ModalBody, Divider, ScrollShadow } from '@heroui/react';
import { SlidersHorizontal } from 'lucide-react';
import { ResponsiveModal } from '@/components/ui';
import { BrewMethodsSection } from '@/components/settings/BrewMethodsSection';
import { ShopTagsSection } from '@/components/settings/ShopTagsSection';
import { ShopFiltersSection } from '@/components/settings/ShopFiltersSection';

interface FilterPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FilterPreferencesModal({ isOpen, onClose }: FilterPreferencesModalProps) {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Clear toast when modal closes
  useEffect(() => {
    if (!isOpen) {
      setToast(null);
    }
  }, [isOpen]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
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
        {/* Toast notification */}
        {toast && (
          <div
            className="mb-4 px-4 py-2 rounded-lg text-sm"
            style={{
              backgroundColor: toast.type === 'success' ? 'var(--success)' : 'var(--error)',
              color: 'white',
            }}
          >
            {toast.message}
          </div>
        )}

        <ScrollShadow className="space-y-6 max-h-[60vh] lg:max-h-[65vh]">
          <BrewMethodsSection
            onSuccess={(msg) => showToast(msg, 'success')}
            onError={(msg) => showToast(msg, 'error')}
          />

          <Divider />

          <ShopTagsSection
            onSuccess={(msg) => showToast(msg, 'success')}
            onError={(msg) => showToast(msg, 'error')}
          />

          <Divider />

          <ShopFiltersSection
            onSuccess={(msg) => showToast(msg, 'success')}
            onError={(msg) => showToast(msg, 'error')}
          />
        </ScrollShadow>
      </ModalBody>
    </ResponsiveModal>
  );
}
