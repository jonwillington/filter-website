# Account Preferences & Reviews Implementation Plan

## Overview
Mirror the filter-expo account preferences and shop reviews functionality in filter-website, sharing the same Firestore records for cross-platform consistency.

---

## Phase 1: Settings Page & Theme Toggle

### 1.1 Create Settings Page Structure
- **File**: `app/settings/page.tsx`
- Settings sections:
  - Personal Details (display name)
  - Theme (dark mode toggle)
  - Coffee Preferences (brew methods, tags)
  - Shop Filters (independent only)
  - Account Actions (sign out, delete account)

### 1.2 Theme Context & Dark Mode Toggle
- **Create**: `lib/context/ThemeContext.tsx`
- Store `themeMode` in user preferences (Firestore)
- Apply theme class to document root
- Respect system preference when set to 'system'
- Persist to Firestore on change

### 1.3 Update globals.css for Dark Mode
- Add `.dark` class variants for all CSS variables
- Ensure smooth transitions

---

## Phase 2: User Profile Editing

### 2.1 Display Name Editor
- **Component**: `components/settings/PersonalDetailsSection.tsx`
- Inline edit with save button
- Validation (non-empty, trimmed)
- Update via `userService.updateUserProfile()`
- Success feedback toast

### 2.2 Profile Page Enhancement
- **File**: `app/profile/page.tsx`
- Show user info, stats, badges
- Link to settings

---

## Phase 3: Coffee Preferences

### 3.1 Brew Methods Selector
- **Component**: `components/settings/BrewMethodsSection.tsx`
- Display brew method chips (same as filter-expo constants)
- Multi-select toggle
- Save to `preferences.preferredBrewMethods`
- Success feedback

### 3.2 Shop Tags Preferences
- **Component**: `components/settings/ShopTagsSection.tsx`
- Fetch available tags from API
- Multi-select chips
- Save to `preferences.preferredTags`

### 3.3 Independent Shops Filter
- **Component**: `components/settings/ShopFiltersSection.tsx`
- Toggle switch for `preferIndependentOnly`
- Explanation text

---

## Phase 4: Shop Reviews

### 4.1 Review Modal Component
- **Create**: `components/reviews/ReviewModal.tsx`
- Header with shop name
- Star rating inputs:
  - Overall rating (1-5)
  - Coffee quality (1-5)
  - Service (1-5)
  - Interior (1-5)
- Tag selection from shop's available tags
- Comment textarea (max 500 chars)
- Submit button with loading state
- Success animation/feedback

### 4.2 Star Rating Input Component
- **Create**: `components/ui/StarRatingInput.tsx`
- Interactive star selection
- Half-star support (optional)
- Accessible keyboard navigation

### 4.3 Review Service Updates
- **Verify**: `lib/services/reviewsService.ts`
- Ensure `submitReview()` matches filter-expo format
- Update aggregates in `shopQuickReviewSummaries`
- Update user stats in `userQuickPreferences`

### 4.4 Shop Detail Integration
- Add "Write Review" button to shop drawer
- Display existing reviews in shop detail
- **Component**: `components/detail/ShopReviewsSection.tsx`

### 4.5 User Reviews Page
- **Create**: `app/reviews/page.tsx`
- List user's submitted reviews
- Edit/delete functionality

---

## Phase 5: Integration & Polish

### 5.1 Navigation Updates
- Add Settings link to UserMenu
- Add Reviews link to UserMenu
- Update mobile navigation

### 5.2 Toast/Notification System
- **Create**: `components/ui/Toast.tsx` or use HeroUI
- Success/error feedback for all actions

### 5.3 Loading States
- Skeleton loaders for settings sections
- Optimistic updates where appropriate

---

## File Structure

```
app/
├── settings/
│   └── page.tsx                    # Settings page
├── reviews/
│   └── page.tsx                    # User's reviews
├── profile/
│   └── page.tsx                    # Enhanced profile

components/
├── settings/
│   ├── PersonalDetailsSection.tsx  # Display name editor
│   ├── ThemeSection.tsx            # Dark mode toggle
│   ├── BrewMethodsSection.tsx      # Brew preferences
│   ├── ShopTagsSection.tsx         # Tag preferences
│   └── ShopFiltersSection.tsx      # Independent filter
├── reviews/
│   ├── ReviewModal.tsx             # Review submission modal
│   ├── ReviewCard.tsx              # Single review display
│   └── ReviewsList.tsx             # Reviews list
├── detail/
│   └── ShopReviewsSection.tsx      # Reviews in shop detail
└── ui/
    ├── StarRatingInput.tsx         # Interactive star input
    └── Toast.tsx                   # Feedback toasts

lib/
├── context/
│   └── ThemeContext.tsx            # Theme provider
├── constants/
│   └── brewMethods.ts              # Brew method definitions
└── services/
    └── reviewsService.ts           # (verify/update)
```

---

## Firestore Schema (Matching filter-expo)

### users/{uid}
```typescript
{
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  country: string | null;
  timezone?: string;
  preferences: {
    themeMode: 'light' | 'dark' | 'system';
    themeType: 'normal' | 'greenBean' | 'darkRoast';
    preferredBrewMethods?: string[];
    preferredTags?: string[];
    preferIndependentOnly?: boolean;
    hiddenBrandIds?: string[];
    personalizationComplete?: boolean;
  };
}
```

### shopQuickReviews/{reviewId}
```typescript
{
  id: string;
  shopId: string;
  shopName: string;
  userId: string;
  userDisplayName: string;
  overallRating: number; // 1-5
  ratings: {
    coffee: number;
    service: number;
    interior: number;
  };
  tags: string[];
  comment: string | null;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  likes: number;
  likedBy: string[];
  cityAreaId?: string;
  cityAreaName?: string;
  locationId?: string;
  locationName?: string;
}
```

### shopQuickReviewSummaries/{shopId}
```typescript
{
  ratings: {
    overall: { total: number; count: number };
    coffee: { total: number; count: number };
    service: { total: number; count: number };
    interior: { total: number; count: number };
  };
  tagCounts: { [tagKey: string]: number };
  tagLabels: { [tagKey: string]: string };
  lastReviewAt: Timestamp;
}
```

---

## Implementation Order

1. **Theme Context & Dark Mode** - Quick win, visible impact
2. **Settings Page Shell** - Navigation and structure
3. **Personal Details Section** - Display name editing
4. **Brew Methods & Tags** - Preference selectors
5. **Independent Filter** - Simple toggle
6. **Review Modal** - Core review functionality
7. **Shop Reviews Display** - Show reviews in shop detail
8. **User Reviews Page** - User's review management

---

## Key Considerations

- **Cross-platform sync**: All data stored in same Firestore collections as filter-expo
- **Real-time updates**: Use React Query invalidation for immediate UI updates
- **Offline support**: Not critical for web, but graceful error handling
- **Accessibility**: Keyboard navigation, ARIA labels, focus management
- **Mobile responsiveness**: Settings page must work on mobile browsers
