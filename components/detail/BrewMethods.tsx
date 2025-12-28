import { Shop } from '@/lib/types';
import { Chip } from '@heroui/react';
import { getMergedBrewMethods } from '@/lib/utils';
import { Coffee } from 'lucide-react';

interface BrewMethodsProps {
  shop: Shop;
}

const brewMethodLabels: Record<string, string> = {
  has_espresso: 'Espresso',
  has_filter_coffee: 'Filter',
  has_v60: 'V60',
  has_chemex: 'Chemex',
  has_aeropress: 'AeroPress',
  has_french_press: 'French Press',
  has_cold_brew: 'Cold Brew',
  has_batch_brew: 'Batch Brew',
  has_slow_bar: 'Slow Bar',
};

export function BrewMethods({ shop }: BrewMethodsProps) {
  const methods = getMergedBrewMethods(shop);
  const activeMethodKeys = Object.entries(methods)
    .filter(([, value]) => value)
    .map(([key]) => key);

  if (activeMethodKeys.length === 0) return null;

  return (
    <div>
      <h3 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-3">
        Brew Methods
      </h3>
      <div className="flex flex-wrap gap-2">
        {activeMethodKeys.map((key) => (
          <Chip
            key={key}
            variant="flat"
            size="sm"
            startContent={<Coffee className="w-3.5 h-3.5" />}
            classNames={{
              base: 'bg-accent/10',
              content: 'text-accent text-xs font-medium',
            }}
          >
            {brewMethodLabels[key] || key}
          </Chip>
        ))}
      </div>
    </div>
  );
}
