'use client';

import { useState, useEffect } from 'react';
import { Switch } from '@heroui/react';
import { useAuth } from '@/lib/context/AuthContext';
import { userService } from '@/lib/services/userService';
import { Store } from 'lucide-react';

interface ShopFiltersSectionProps {
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export function ShopFiltersSection({ onSuccess, onError }: ShopFiltersSectionProps) {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const [preferIndependentOnly, setPreferIndependentOnly] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (userProfile?.preferences?.preferIndependentOnly !== undefined) {
      setPreferIndependentOnly(userProfile.preferences.preferIndependentOnly);
    }
  }, [userProfile?.preferences?.preferIndependentOnly]);

  const handleToggle = async (checked: boolean) => {
    if (!user?.uid) return;

    setPreferIndependentOnly(checked);
    setIsUpdating(true);

    try {
      await userService.updateUserPreferences(user.uid, {
        preferIndependentOnly: checked,
      });
      await refreshUserProfile();
      onSuccess?.(checked ? 'Showing independent shops only' : 'Showing all shops');
    } catch (error) {
      console.error('Failed to update shop filter:', error);
      setPreferIndependentOnly(!checked);
      onError?.('Failed to update filter');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
        Shop Filters
      </h3>

      <div
        className="flex items-center justify-between p-4 rounded-lg"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-lg"
            style={{ backgroundColor: 'var(--background)' }}
          >
            <Store className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <p className="font-medium" style={{ color: 'var(--text)' }}>
              Independent shops only
            </p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Hide chain coffee shops from your results
            </p>
          </div>
        </div>
        <Switch
          isSelected={preferIndependentOnly}
          onValueChange={handleToggle}
          isDisabled={isUpdating}
          aria-label="Show independent shops only"
        />
      </div>
    </div>
  );
}
