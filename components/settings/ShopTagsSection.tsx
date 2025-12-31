'use client';

import { useState, useEffect } from 'react';
import { Button, Chip } from '@heroui/react';
import { useAuth } from '@/lib/context/AuthContext';
import { userService } from '@/lib/services/userService';
import { shopTagOptions } from '@/lib/constants/shopTags';
import { Check } from 'lucide-react';

interface ShopTagsSectionProps {
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export function ShopTagsSection({ onSuccess, onError }: ShopTagsSectionProps) {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (userProfile?.preferences?.preferredTags) {
      setSelectedTags(new Set(userProfile.preferences.preferredTags));
    }
  }, [userProfile?.preferences?.preferredTags]);

  const toggleTag = (key: string) => {
    const newSelected = new Set(selectedTags);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedTags(newSelected);

    const original = new Set(userProfile?.preferences?.preferredTags || []);
    const changed = newSelected.size !== original.size ||
      Array.from(newSelected).some(t => !original.has(t));
    setHasChanges(changed);
  };

  const handleSave = async () => {
    if (!user?.uid) return;

    setIsSaving(true);
    try {
      await userService.updateUserPreferences(user.uid, {
        preferredTags: Array.from(selectedTags),
        personalizationComplete: true,
      });
      await refreshUserProfile();
      setHasChanges(false);
      onSuccess?.('Tag preferences updated');
    } catch (error) {
      console.error('Failed to update tag preferences:', error);
      onError?.('Failed to update tag preferences');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
          Shop Vibes
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
        Select your preferred shop vibes. We&apos;ll highlight shops that match your style.
      </p>

      <div className="flex flex-wrap gap-2">
        {shopTagOptions.map((tag) => {
          const isSelected = selectedTags.has(tag.key);
          const Icon = tag.icon;

          return (
            <Chip
              key={tag.key}
              variant={isSelected ? 'solid' : 'bordered'}
              color={isSelected ? 'primary' : 'default'}
              className="cursor-pointer transition-all"
              onClick={() => toggleTag(tag.key)}
              startContent={<Icon className="w-4 h-4" />}
            >
              {tag.label}
            </Chip>
          );
        })}
      </div>
    </div>
  );
}
