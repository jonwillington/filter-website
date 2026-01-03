import { Shop } from '@/lib/types';
import { BrewMethodChip } from '@/components/ui';
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
    <div className="bg-surface rounded-xl p-4 flex gap-3">
      <div className="w-10 h-10 bg-chipBackground rounded-lg flex items-center justify-center flex-shrink-0">
        <Coffee className="w-5 h-5 text-text" />
      </div>
      <div className="flex-1">
        <h4 className="text-sm font-semibold text-text mb-2">Brew Methods</h4>
        <div className="flex flex-wrap gap-2">
          {activeMethodKeys.map((key) => (
            <BrewMethodChip key={key}>
              {brewMethodLabels[key] || key}
            </BrewMethodChip>
          ))}
        </div>
      </div>
    </div>
  );
}
