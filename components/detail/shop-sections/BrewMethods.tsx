import { Shop } from '@/lib/types';
import { BrewMethodChip, PropertyRow } from '@/components/ui';
import { getMergedBrewMethods } from '@/lib/utils';

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
    <PropertyRow label="Brew methods">
      {activeMethodKeys.map((key) => (
        <BrewMethodChip key={key}>
          {brewMethodLabels[key] || key}
        </BrewMethodChip>
      ))}
    </PropertyRow>
  );
}
