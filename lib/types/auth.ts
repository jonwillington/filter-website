export interface UserCountry {
  documentId: string;
  name: string;
  code: string;
}

export interface CityAreaBadge {
  cityAreaId: string;
  cityAreaName: string;
  locationId: string;
  locationName: string;
  reviewCount: number;
  earnedAt: Date;
}

export interface CityBadge {
  locationId: string;
  locationName: string;
  reviewCount: number;
  earnedAt: Date;
}

export interface TopContributorBadge {
  earned: boolean;
  reviewCount: number;
  earnedAt: Date | null;
}

export interface EarlyAdopterBadge {
  earned: boolean;
  signupRank: number | null;
  earnedAt: Date | null;
}

export interface UserBadges {
  cityAreaBadges: CityAreaBadge[];
  cityBadges: CityBadge[];
  topContributor: TopContributorBadge;
  earlyAdopter: EarlyAdopterBadge;
  totalReviews: number;
  lastRecalculatedAt: Date;
}

export interface AICachedSummary {
  summary: string;
  generatedAt: Date;
  costEstimateUsd: number | null;
  source: 'ai' | 'heuristic';
  preferencesHash: string;
}

export interface UserPreferences {
  themeType: 'normal' | 'greenBean' | 'darkRoast';
  themeMode: 'light' | 'dark';
  locationMode: 'gps' | 'simulation';
  simulationLocationId?: string;
  preferredBrewMethods?: string[];
  preferredTags?: string[];
  preferIndependentOnly?: boolean;
  hiddenBrandIds?: string[];
  personalizationComplete?: boolean;
  preferencesAlertDismissed?: boolean;
  aiSummary?: AICachedSummary | null;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Date;
  updatedAt: Date;
  preferredName: string | null;
  country: UserCountry | null;
  countryDetectedAt: Date | null;
  timezone?: string | null;
  preferences: UserPreferences | null;
  badges?: UserBadges | null;
  about?: string;
}

export interface Favorite {
  id: string;
  userId: string;
  shopId: string;
  shopName: string;
  createdAt: Date;
}

export interface Review {
  id: string;
  shopId: string;
  shopName: string;
  userId: string | null;
  userDisplayName: string | null;
  overallRating: number;
  ratings: {
    coffee: number;
    service: number;
    interior: number;
  };
  tags: string[];
  comment: string | null;
  createdAt: Date;
  updatedAt?: Date;
  likes: number;
  likedBy: string[];
  cityAreaId?: string | null;
  cityAreaName?: string | null;
  locationId?: string | null;
  locationName?: string | null;
}
