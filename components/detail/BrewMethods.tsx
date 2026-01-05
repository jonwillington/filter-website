import { Shop } from '@/lib/types';
import { BrewMethodChip } from '@/components/ui';
import { getMergedBrewMethods } from '@/lib/utils';
import { Divider } from '@heroui/react';

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
    <>
      <Divider className="my-5 opacity-30" />
      <div>
      <h3 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-3">
        Brew Methods
      </h3>
      <div className="flex flex-wrap gap-2">
        {activeMethodKeys.map((key) => (
          <BrewMethodChip key={key}>
            {brewMethodLabels[key] || key}
          </BrewMethodChip>
        ))}
      </div>
    </div>
    </>
  );
}
