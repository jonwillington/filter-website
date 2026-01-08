'use client';

import { Chip } from '@heroui/react';
import { shopTagOptions } from '@/lib/constants/shopTags';

interface ShopTagsSectionProps {
  selectedTags: Set<string>;
  onTagsChange: (tags: Set<string>) => void;
}

export function ShopTagsSection({ selectedTags, onTagsChange }: ShopTagsSectionProps) {
  const toggleTag = (key: string) => {
    const newSelected = new Set(selectedTags);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    onTagsChange(newSelected);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
        Shop Vibes
      </h3>

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
