'use client';

import { useState, useEffect } from 'react';
import { Button, Chip } from '@heroui/react';
import { useAuth } from '@/lib/context/AuthContext';
import { userService } from '@/lib/services/userService';
import { brewMethodOptions } from '@/lib/constants/brewMethods';
import { Check } from 'lucide-react';

interface BrewMethodsSectionProps {
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export function BrewMethodsSection({ onSuccess, onError }: BrewMethodsSectionProps) {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const [selectedMethods, setSelectedMethods] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (userProfile?.preferences?.preferredBrewMethods) {
      setSelectedMethods(new Set(userProfile.preferences.preferredBrewMethods));
    }
  }, [userProfile?.preferences?.preferredBrewMethods]);

  const toggleMethod = (key: string) => {
    const newSelected = new Set(selectedMethods);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedMethods(newSelected);

    const original = new Set(userProfile?.preferences?.preferredBrewMethods || []);
    const changed = newSelected.size !== original.size ||
      Array.from(newSelected).some(m => !original.has(m));
    setHasChanges(changed);
  };

  const handleSave = async () => {
    if (!user?.uid) return;

    setIsSaving(true);
    try {
      await userService.updateUserPreferences(user.uid, {
        preferredBrewMethods: Array.from(selectedMethods),
        personalizationComplete: true,
      });
      await refreshUserProfile();
      setHasChanges(false);
      onSuccess?.('Brew preferences updated');
    } catch (error) {
      console.error('Failed to update brew preferences:', error);
      onError?.('Failed to update brew preferences');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
          Brew Methods
        </h3>
        {hasChanges && (
          <Button
            size="sm"
            color="primary"
            onPress={handleSave}
            isLoading={isSaving}
            startContent={!isSaving ? <Check className="w-4 h-4" /> : null}
          >
            Save
          </Button>
        )}
      </div>

      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Select your preferred brewing methods. We&apos;ll highlight shops that offer these.
      </p>

      <div className="flex flex-wrap gap-2">
        {brewMethodOptions.map((method) => {
          const isSelected = selectedMethods.has(method.key);
          const Icon = method.icon;

          return (
            <Chip
              key={method.key}
              variant={isSelected ? 'solid' : 'bordered'}
              color={isSelected ? 'primary' : 'default'}
              className="cursor-pointer transition-all"
              onClick={() => toggleMethod(method.key)}
              startContent={<Icon className="w-4 h-4" />}
            >
              {method.label}
            </Chip>
          );
        })}
      </div>
    </div>
  );
}
