'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Divider } from '@heroui/react';
import { useAuth } from '@/lib/context/AuthContext';
import { PersonalDetailsSection } from '@/components/settings/PersonalDetailsSection';
import { ThemeSection } from '@/components/settings/ThemeSection';
import { BrewMethodsSection } from '@/components/settings/BrewMethodsSection';
import { ShopTagsSection } from '@/components/settings/ShopTagsSection';
import { ShopFiltersSection } from '@/components/settings/ShopFiltersSection';
import { ArrowLeft, LogOut, Trash2 } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { user, signOut, deleteAccount } = useAuth();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Prevent SSR issues with HeroUI components
  useEffect(() => {
    setMounted(true);
  }, []);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      showToast('Failed to sign out', 'error');
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
      router.push('/');
    } catch (error) {
      showToast('Failed to delete account', 'error');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Return loading placeholder during SSR to avoid HeroUI location errors
  if (!mounted) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-32" />
            <div className="h-4 bg-gray-200 rounded w-48" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push('/');
    return null;
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--background)', paddingBottom: '80px' }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 backdrop-blur-md"
        style={{
          backgroundColor: 'rgba(var(--background), 0.95)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            isIconOnly
            variant="light"
            onPress={() => router.back()}
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
            Settings
          </h1>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg animate-fade-in"
          style={{
            backgroundColor: toast.type === 'success' ? 'var(--success)' : 'var(--error)',
            color: 'white',
          }}
        >
          {toast.message}
        </div>
      )}

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        <PersonalDetailsSection
          onSuccess={(msg) => showToast(msg, 'success')}
          onError={(msg) => showToast(msg, 'error')}
        />

        <Divider />

        <ThemeSection />

        <Divider />

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
                  >
                    Yes, Delete
                  </Button>
                  <Button
                    variant="flat"
                    onPress={() => setShowDeleteConfirm(false)}
                    isDisabled={isDeleting}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
