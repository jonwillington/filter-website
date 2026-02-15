'use client';

import { Chip, Spinner } from '@heroui/react';
import { useTags } from '@/lib/hooks/useTags';

interface ShopTagsSectionProps {
  selectedTags: Set<string>;
  onTagsChange: (tags: Set<string>) => void;
}

export function ShopTagsSection({ selectedTags, onTagsChange }: ShopTagsSectionProps) {
  const { tags, isLoading } = useTags();

  const toggleTag = (id: string) => {
    const newSelected = new Set(selectedTags);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
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

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Spinner size="sm" />
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => {
            const isSelected = selectedTags.has(tag.id);

            return (
              <Chip
                key={tag.id}
                variant={isSelected ? 'solid' : 'bordered'}
                color={isSelected ? 'primary' : 'default'}
                className="cursor-pointer transition-all font-mono"
                onClick={() => toggleTag(tag.id)}
              >
                {tag.label}
              </Chip>
            );
          })}
        </div>
      )}
    </div>
  );
}
