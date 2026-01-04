# Claude Code Project Rules

## CRITICAL: Environment Files

**NEVER modify `.env.local`, `.env`, `.env.production`, or any environment configuration files without explicit user confirmation.** These files contain sensitive credentials and environment-specific settings. Always ask before making changes.

---

## UI Design Principles (Airbnb-Inspired)

When making UI changes, follow these content-first design principles. Design should feel effortless — the interface disappears, and content becomes the experience.

### Hierarchy & Typography
- **Dominant headers**: Use significant size contrast between heading levels. One clear focal point per page.
- **Let type do the work**: Strong typographic hierarchy reduces need for visual embellishment.
- **Readable line lengths**: Body text 50-75 characters. Line height 1.5-1.7 for body copy.

### Space & Breathing Room
- **Whitespace is structural**: Space groups, separates, and focuses. Use it deliberately.
- **Consistent spatial rhythm**: Establish a spacing scale and apply it religiously.
- **Let content breathe**: When uncertain, add more space. Cramped interfaces create cognitive load.
- **Asymmetric generosity**: More space above headers than below. Give sections room to land.

### Separation & Containment
- **Borders over backgrounds**: Subtle borders to separate content rather than competing background colours.
- **Cards with restraint**: Minimal shadow (if any), simple borders, generous internal padding.
- **Implied boundaries**: Let whitespace create separation without explicit dividers where possible.

### Consistency & Rhythm
- **Systematic repetition**: If a pattern appears twice, it should appear identically.
- **Predictable placement**: Actions in consistent locations. Related information grouped.
- **Visual rhythm**: Repeated elements at regular intervals. Grids are your friend.

### Interaction & Feedback
- **Quiet until needed**: Default states are calm. Hover/focus/active states provide feedback without shouting.
- **Obvious affordances**: Interactive elements unambiguous. Sufficient contrast, clear hit targets (min 44px touch).
- **Progressive disclosure**: Show what's needed now. Reveal complexity on demand.

### Colour & Contrast
- **Restrained palette**: Reserve brand/action colours for primary interactions. Neutrals for hierarchy.
- **Accessibility first**: WCAG AA minimum. Text and interactive elements must meet contrast requirements.
- **Semantic colour**: Use destructive/success/warning appropriately. Never rely on colour alone.

### When Reviewing UI Changes
1. Ask: "What is the single most important thing on this screen?"
2. Check: Does the hierarchy support that?
3. Verify: Is spacing consistent and generous?
4. Question: Can any element be removed without loss?
5. Test: Would a new user understand what to do?

---

## MapContainer.tsx - Critical Rules

### DO NOT BREAK THE MAP CLUSTERING

The map clustering setup in `components/map/MapContainer.tsx` has specific timing requirements. When modifying this file:

1. **Never remove `mapReady` from dependency arrays** - The clustering and country layer effects MUST depend on `mapReady` to prevent race conditions where they run before the map is initialized.

2. **Key dependency arrays that must include `mapReady`:**
   - Clustering setup effect (~line 547): `[displayedShops, createMarkerElement, mapReady]`
   - Country layer effect (~line 365): `[countries, onUnsupportedCountryClick, displayedShops, mapReady]`

3. **The `mapReady` state is set in the map initialization effect** when the map 'load' event fires. This ensures all other effects wait for the map to be ready.

4. **When refactoring utility functions** (like `getShopCoords`, `calculateDistance`, `calculateLocalDensity`):
   - Imported functions do NOT need to be in dependency arrays
   - But `mapReady` MUST stay in the dependency arrays

### Common Issues

- **Map loads but no markers**: Usually means the clustering effect ran before `mapReady` was true and never re-ran. Check that `mapReady` is in the dependencies.
- **Spinner never hides**: Check that `setCountryLayerReady(true)` is being called after map loads.

### Testing After Changes

After any changes to MapContainer.tsx:
1. Hard refresh the page (Cmd+Shift+R)
2. Verify the spinner disappears
3. Verify markers appear on the map
4. Verify clicking on markers works

Reference Project: filter-expo
Before proposing workarounds or alternative approaches, consult the filter-expo project in the same directory. This project contains established patterns for API routes, component structure, state management, authentication, and error handling.
If you encounter a technical challenge, check filter-expo first. The solution likely already exists. Replicate proven patterns rather than inventing new ones. Only propose novel approaches when filter-expo genuinely lacks a relevant precedent.

---

## Strapi API Population

When adding new fields to types or using new data from Strapi:

1. **Always check `lib/api/shops.ts`** - The `SHOP_POPULATE` array explicitly lists which fields are fetched from the API
2. **Strapi doesn't return all fields by default** - When using `populate[relation][fields]`, you must explicitly list every field you need (including `id` and `documentId`)
3. **New fields require API changes** - Adding a field to a TypeScript interface does NOT make it appear in the data. You must also add it to the populate params.
4. **Clear cache after API changes** - Delete `.next` folder and restart dev server to see changes

Example: To add a `group` field to `city_area`:
```
'populate[city_area][fields][0]=id',
'populate[city_area][fields][1]=documentId',
'populate[city_area][fields][2]=name',
'populate[city_area][fields][3]=group',  // <-- Add the new field
```

#### Preventing breaking production builds
When we debug why something did not build properly in production lets learn from it, add here what went wrong and make sure this doenst happen in future - we waste time doing this every tikme

---

## Dark Mode & Color Tokens

This project uses a **semantic color token system** that automatically handles light/dark mode. **Never use hardcoded colors**.

### Color Token System

CSS variables are defined in `app/globals.css` and exposed via Tailwind in `tailwind.config.js`.

**Available Tailwind classes (auto-switch between light/dark):**
- `bg-background` - Main page background
- `bg-surface` - Cards, panels, elevated surfaces
- `bg-surface-elevated` - Modals, popovers (higher elevation)
- `text-primary` - Primary text color
- `text-text-secondary` - Secondary/muted text
- `text-contrastText` - Text on contrast blocks
- `bg-contrastBlock` - High-contrast background (inverts in dark mode)
- `border-border-default` - Default border color
- `text-accent` / `bg-accent` - Brand accent color
- `text-error` / `text-success` / `text-warning` - Semantic colors

### Dark Mode Design

Dark mode uses **warm brown tones** (like the gradient header), NOT cold blacks/grays:
- Background: `#1A1410` (very dark brown)
- Surface: `#251C16` (dark brown)
- Surface elevated: `#2E2219` (medium brown)
- Text: `#FAF7F5` (warm off-white)
- Text secondary: `#A89B8C` (warm gray-brown)
- Border: `#3D2E25` (brown border)

### Rules for Color Usage

**DO:**
```tsx
// Use semantic Tailwind classes
<div className="bg-background text-primary border-border-default">
<button className="bg-surface hover:bg-border-default text-text-secondary">
<div className="bg-contrastBlock text-contrastText">
```

**DON'T:**
```tsx
// Never use hardcoded colors
<div className="bg-white">  // ❌
<div className="bg-gray-100">  // ❌
<div className="text-gray-700">  // ❌
<div style={{ backgroundColor: '#ffffff' }}>  // ❌
```

### Common Migrations

| Hardcoded | Replace With |
|-----------|--------------|
| `bg-white` | `bg-background` |
| `bg-gray-50`, `bg-gray-100` | `bg-surface` |
| `bg-gray-200` | `bg-border-default` |
| `text-gray-900`, `text-black` | `text-primary` |
| `text-gray-500`, `text-gray-600` | `text-text-secondary` |
| `border-gray-100`, `border-gray-200` | `border-border-default` |

### For Inline Styles (JavaScript)

When you must use inline styles (e.g., in map markers), access the theme:
```tsx
import { useTheme } from '@/lib/context/ThemeContext';

const { effectiveTheme } = useTheme();
const isDark = effectiveTheme === 'dark';

// Then use conditional values
const bgColor = isDark ? '#251C16' : 'white';
const textColor = isDark ? '#FAF7F5' : '#1a1a1a';
```

### Testing Dark Mode

After any UI changes:
1. Toggle dark mode using the footer sun/moon icon
2. Verify all backgrounds use warm brown tones (not gray/black)
3. Check text is readable with sufficient contrast
4. Verify borders and dividers are visible