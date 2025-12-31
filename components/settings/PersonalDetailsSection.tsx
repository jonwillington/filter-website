'use client';

import { useState, useEffect } from 'react';
import { Input, Button } from '@heroui/react';
import { useAuth } from '@/lib/context/AuthContext';
import { userService } from '@/lib/services/userService';
import { Check, X, Pencil } from 'lucide-react';

interface PersonalDetailsSectionProps {
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export function PersonalDetailsSection({ onSuccess, onError }: PersonalDetailsSectionProps) {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userProfile?.displayName) {
      setDisplayName(userProfile.displayName);
    }
  }, [userProfile?.displayName]);

  const handleSave = async () => {
    const trimmed = displayName.trim();
    if (!trimmed) {
      onError?.('Display name cannot be empty');
      return;
    }

    if (!user?.uid) return;

    setIsSaving(true);
    try {
      await userService.updateUserProfile(user.uid, { displayName: trimmed });
      await refreshUserProfile();
      setIsEditing(false);
      onSuccess?.('Display name updated');
    } catch (error) {
      console.error('Failed to update display name:', error);
      onError?.('Failed to update display name');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDisplayName(userProfile?.displayName || '');
    setIsEditing(false);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
        Personal Details
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Email
          </label>
          <p style={{ color: 'var(--text)' }}>{userProfile?.email}</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Display Name
          </label>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter display name"
                size="sm"
                className="flex-1"
                autoFocus
              />
              <Button
                isIconOnly
                size="sm"
                color="success"
                variant="flat"
                onPress={handleSave}
                isLoading={isSaving}
                aria-label="Save"
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button
                isIconOnly
                size="sm"
                color="default"
                variant="flat"
                onPress={handleCancel}
                isDisabled={isSaving}
                aria-label="Cancel"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p style={{ color: 'var(--text)' }}>{userProfile?.displayName}</p>
              <Button
                isIconOnly
                size="sm"
                variant="light"
                onPress={() => setIsEditing(true)}
                aria-label="Edit display name"
              >
                <Pencil className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
