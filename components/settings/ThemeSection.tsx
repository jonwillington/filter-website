'use client';

import { Select, SelectItem } from '@heroui/react';
import { useTheme } from '@/lib/context/ThemeContext';
import { Sun, Moon, Monitor } from 'lucide-react';

const themeOptions = [
  { key: 'light', label: 'Light', icon: Sun },
  { key: 'dark', label: 'Dark', icon: Moon },
  { key: 'system', label: 'System', icon: Monitor },
] as const;

export function ThemeSection() {
  const { themeMode, setThemeMode, effectiveTheme } = useTheme();

  const handleChange = (keys: any) => {
    const selected = Array.from(keys)[0] as 'light' | 'dark' | 'system';
    if (selected) {
      setThemeMode(selected);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
        Appearance
      </h3>

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
          Theme
        </label>
        <Select
          selectedKeys={[themeMode]}
          onSelectionChange={handleChange}
          className="max-w-xs"
          aria-label="Select theme"
          renderValue={(items) => {
            const selected = themeOptions.find(opt => opt.key === themeMode);
            if (!selected) return null;
            const Icon = selected.icon;
            return (
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                <span>{selected.label}</span>
              </div>
            );
          }}
        >
          {themeOptions.map((option) => {
            const Icon = option.icon;
            return (
              <SelectItem key={option.key} textValue={option.label}>
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span>{option.label}</span>
                </div>
              </SelectItem>
            );
          })}
        </Select>
        {themeMode === 'system' && (
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Currently using {effectiveTheme} mode based on your system settings
          </p>
        )}
      </div>
    </div>
  );
}
