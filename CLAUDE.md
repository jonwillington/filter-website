# Claude Code Project Rules

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

#### Preventing breaking production builds
When we debug why something did not build properly in production lets learn from it, add here what went wrong and make sure this doenst happen in future - we waste time doing this every tikme