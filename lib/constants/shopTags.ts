import {
  Laptop,
  Sofa,
  Wifi,
  Sun,
  Dog,
  Utensils,
  Music,
  BookOpen,
  Users,
  Zap,
  TreePine,
  Camera,
  Clock,
  Heart,
  LucideIcon,
} from 'lucide-react';

export interface ShopTagOption {
  key: string;
  label: string;
  icon: LucideIcon;
}

export const shopTagOptions: ShopTagOption[] = [
  { key: 'good_for_work', label: 'Good for Work', icon: Laptop },
  { key: 'cozy', label: 'Cozy', icon: Sofa },
  { key: 'fast_wifi', label: 'Fast WiFi', icon: Wifi },
  { key: 'outdoor_seating', label: 'Outdoor Seating', icon: Sun },
  { key: 'pet_friendly', label: 'Pet Friendly', icon: Dog },
  { key: 'great_food', label: 'Great Food', icon: Utensils },
  { key: 'good_music', label: 'Good Music', icon: Music },
  { key: 'quiet', label: 'Quiet', icon: BookOpen },
  { key: 'social_vibe', label: 'Social Vibe', icon: Users },
  { key: 'quick_service', label: 'Quick Service', icon: Zap },
  { key: 'natural_light', label: 'Natural Light', icon: TreePine },
  { key: 'instagram_worthy', label: 'Instagram Worthy', icon: Camera },
  { key: 'early_opener', label: 'Early Opener', icon: Clock },
  { key: 'local_favorite', label: 'Local Favorite', icon: Heart },
];

export const shopTagOptionsMap = shopTagOptions.reduce<Record<string, ShopTagOption>>(
  (acc, option) => {
    acc[option.key] = option;
    return acc;
  },
  {}
);
