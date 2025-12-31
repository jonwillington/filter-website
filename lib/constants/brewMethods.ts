import {
  Coffee,
  Filter,
  Beaker,
  Droplets,
  FlaskConical,
  Settings,
  Snowflake,
  Layers,
  LucideIcon,
} from 'lucide-react';

export interface BrewMethodOption {
  key:
    | 'espresso'
    | 'filter_coffee'
    | 'aeropress'
    | 'v60'
    | 'chemex'
    | 'french_press'
    | 'cold_brew'
    | 'batch_brew';
  label: string;
  icon: LucideIcon;
}

export const brewMethodOptions: BrewMethodOption[] = [
  { key: 'espresso', label: 'Espresso', icon: Coffee },
  { key: 'filter_coffee', label: 'Filter', icon: Filter },
  { key: 'aeropress', label: 'AeroPress', icon: Beaker },
  { key: 'v60', label: 'V60', icon: Droplets },
  { key: 'chemex', label: 'Chemex', icon: FlaskConical },
  { key: 'french_press', label: 'French Press', icon: Settings },
  { key: 'cold_brew', label: 'Cold Brew', icon: Snowflake },
  { key: 'batch_brew', label: 'Batch Brew', icon: Layers },
];

export const brewMethodOptionsMap = brewMethodOptions.reduce<Record<string, BrewMethodOption>>(
  (acc, option) => {
    acc[option.key] = option;
    return acc;
  },
  {}
);
