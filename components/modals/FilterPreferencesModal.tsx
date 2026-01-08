'use client';

import { useState, useEffect } from 'react';
import { ModalHeader, ModalBody, ModalFooter, Divider, ScrollShadow, Button } from '@heroui/react';
import { SlidersHorizontal, Check, RotateCcw } from 'lucide-react';
import { ResponsiveModal } from '@/components/ui';
import { useAuth } from '@/lib/context/AuthContext';
import { userService } from '@/lib/services/userService';
import { BrewMethodsSection } from '@/components/settings/BrewMethodsSection';
import { ShopTagsSection } from '@/components/settings/ShopTagsSection';
import { ShopFiltersSection } from '@/components/settings/ShopFiltersSection';

interface FilterPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FilterPreferencesModal({ isOpen, onClose }: FilterPreferencesModalProps) {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const [toast, setToast] = useState<{ message: string; isVisible: boolean } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Local state for all preferences
  const [selectedBrewMethods, setSelectedBrewMethods] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [preferIndependentOnly, setPreferIndependentOnly] = useState(false);
  const [preferRoastsOwnBeans, setPreferRoastsOwnBeans] = useState(false);

  // Track if any changes have been made
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize from user profile when modal opens
  useEffect(() => {
    if (isOpen && userProfile?.preferences) {
      setSelectedBrewMethods(new Set(userProfile.preferences.preferredBrewMethods || []));
      setSelectedTags(new Set(userProfile.preferences.preferredTags || []));
      setPreferIndependentOnly(userProfile.preferences.preferIndependentOnly || false);
      setPreferRoastsOwnBeans(userProfile.preferences.preferRoastsOwnBeans || false);
      setHasChanges(false);
    }
  }, [isOpen, userProfile?.preferences]);

  // Check if there are any filters to reset
  const hasFilters = selectedBrewMethods.size > 0 || selectedTags.size > 0 || preferIndependentOnly || preferRoastsOwnBeans;

  const handleReset = () => {
    setSelectedBrewMethods(new Set());
    setSelectedTags(new Set());
    setPreferIndependentOnly(false);
    setPreferRoastsOwnBeans(false);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!user?.uid) return;

    setIsSaving(true);
    try {
      await userService.updateUserPreferences(user.uid, {
        preferredBrewMethods: Array.from(selectedBrewMethods),
        preferredTags: Array.from(selectedTags),
        preferIndependentOnly,
        preferRoastsOwnBeans,
        personalizationComplete: true,
      });
      await refreshUserProfile();

      // Close modal and show toast
      onClose();
      setTimeout(() => {
        setToast({ message: 'Your settings have been updated', isVisible: true });
      }, 100);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const hideToast = () => {
    setToast((prev) => prev ? { ...prev, isVisible: false } : null);
  };

  // Clear toast after delay
  useEffect(() => {
    if (toast?.isVisible) {
      const timer = setTimeout(() => {
        hideToast();
        setTimeout(() => setToast(null), 200);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast?.isVisible]);

  return (
    <>
      <ResponsiveModal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalHeader className="flex flex-col gap-1 pt-8 px-6">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            <span className="font-display text-2xl font-bold" style={{ color: 'var(--text)' }}>
              Filter Preferences
            </span>
          </div>
          <span className="text-sm font-normal" style={{ color: 'var(--text-secondary)' }}>
            Customize which shops we highlight for you
          </span>
        </ModalHeader>

        <ModalBody className="px-6 pb-0">
          <ScrollShadow className="space-y-6 max-h-[50vh] lg:max-h-[55vh]">
            <BrewMethodsSection
              selectedMethods={selectedBrewMethods}
              onMethodsChange={(methods) => {
                setSelectedBrewMethods(methods);
                setHasChanges(true);
              }}
            />

            <Divider />

            <ShopTagsSection
              selectedTags={selectedTags}
              onTagsChange={(tags) => {
                setSelectedTags(tags);
                setHasChanges(true);
              }}
            />

            <Divider />

            <ShopFiltersSection
              preferIndependentOnly={preferIndependentOnly}
              onIndependentChange={(value) => {
                setPreferIndependentOnly(value);
                setHasChanges(true);
              }}
              preferRoastsOwnBeans={preferRoastsOwnBeans}
              onRoastsOwnBeansChange={(value) => {
                setPreferRoastsOwnBeans(value);
                setHasChanges(true);
              }}
            />
          </ScrollShadow>
        </ModalBody>

        <ModalFooter className="px-6 pb-6 pt-4 gap-3">
          <Button
            variant="flat"
            size="lg"
            onPress={handleReset}
            isDisabled={!hasFilters || isSaving}
            startContent={<RotateCcw className="w-4 h-4" />}
          >
            Reset
          </Button>
          <Button
            color="primary"
            size="lg"
            className="flex-1"
            onPress={handleSave}
            isLoading={isSaving}
            isDisabled={!hasChanges}
            startContent={!isSaving ? <Check className="w-5 h-5" /> : null}
          >
            Save Preferences
          </Button>
        </ModalFooter>
      </ResponsiveModal>

      {/* Toast at bottom of screen */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-xl shadow-lg
            flex items-center gap-3 transition-all duration-200
            ${toast.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
          style={{
            backgroundColor: '#1A1410',
            color: '#FAF7F5',
          }}
        >
          <Check className="w-5 h-5" />
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
      )}
    </>
  );
}
