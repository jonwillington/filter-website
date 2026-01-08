'use client';

import { Switch } from '@heroui/react';
import { Store, Coffee } from 'lucide-react';

interface ShopFiltersSectionProps {
  preferIndependentOnly: boolean;
  onIndependentChange: (value: boolean) => void;
  preferRoastsOwnBeans: boolean;
  onRoastsOwnBeansChange: (value: boolean) => void;
}

export function ShopFiltersSection({
  preferIndependentOnly,
  onIndependentChange,
  preferRoastsOwnBeans,
  onRoastsOwnBeansChange,
}: ShopFiltersSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
        Shop Filters
      </h3>

      <div className="space-y-3">
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
            onValueChange={onIndependentChange}
            aria-label="Show independent shops only"
          />
        </div>

        <div
          className="flex items-center justify-between p-4 rounded-lg"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: 'var(--background)' }}
            >
              <Coffee className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <p className="font-medium" style={{ color: 'var(--text)' }}>
                Roasts their own beans
              </p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Show only roaster cafés
              </p>
            </div>
          </div>
          <Switch
            isSelected={preferRoastsOwnBeans}
            onValueChange={onRoastsOwnBeansChange}
            aria-label="Show only shops that roast their own beans"
          />
        </div>
      </div>
    </div>
  );
}
