'use client';

import { useState, useEffect } from 'react';
import { ModalHeader, ModalBody, Button, Divider, ScrollShadow } from '@heroui/react';
import { Settings, LogOut, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { ResponsiveModal } from '@/components/ui';
import { PersonalDetailsSection } from '@/components/settings/PersonalDetailsSection';
import { ThemeSection } from '@/components/settings/ThemeSection';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const router = useRouter();
  const { signOut, deleteAccount } = useAuth();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setToast(null);
      setShowDeleteConfirm(false);
      setIsDeleting(false);
    }
  }, [isOpen]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      onClose();
      router.push('/');
    } catch (error) {
      showToast('Failed to sign out', 'error');
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
      onClose();
      router.push('/');
    } catch (error) {
      showToast('Failed to delete account', 'error');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <ResponsiveModal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader className="flex flex-col gap-1 pt-8 px-6">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          <span className="font-display text-2xl" style={{ color: 'var(--text)' }}>
            Settings
          </span>
        </div>
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
          <PersonalDetailsSection
            onSuccess={(msg) => showToast(msg, 'success')}
            onError={(msg) => showToast(msg, 'error')}
          />

          <Divider />

          <ThemeSection />

          <Divider />

          {/* Account Actions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
              Account
            </h3>

            <div className="space-y-3">
              <Button
                variant="flat"
                color="default"
                className="w-full justify-start"
                startContent={<LogOut className="w-4 h-4" />}
                onPress={handleSignOut}
              >
                Sign Out
              </Button>

              {!showDeleteConfirm ? (
                <Button
                  variant="flat"
                  color="danger"
                  className="w-full justify-start"
                  startContent={<Trash2 className="w-4 h-4" />}
                  onPress={() => setShowDeleteConfirm(true)}
                >
                  Delete Account
                </Button>
              ) : (
                <div
                  className="p-4 rounded-lg space-y-3"
                  style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--error)' }}
                >
                  <p className="text-sm" style={{ color: 'var(--text)' }}>
                    Are you sure you want to delete your account? This action cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      color="danger"
                      onPress={handleDeleteAccount}
                      isLoading={isDeleting}
                      size="sm"
                    >
                      Yes, Delete
                    </Button>
                    <Button
                      variant="flat"
                      onPress={() => setShowDeleteConfirm(false)}
                      isDisabled={isDeleting}
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollShadow>
      </ModalBody>
    </ResponsiveModal>
  );
}
