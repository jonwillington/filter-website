'use client';

import { Chip } from '@heroui/react';
import { brewMethodOptions } from '@/lib/constants/brewMethods';

interface BrewMethodsSectionProps {
  selectedMethods: Set<string>;
  onMethodsChange: (methods: Set<string>) => void;
}

export function BrewMethodsSection({ selectedMethods, onMethodsChange }: BrewMethodsSectionProps) {
  const toggleMethod = (key: string) => {
    const newSelected = new Set(selectedMethods);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    onMethodsChange(newSelected);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
        Brew Methods
      </h3>

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
