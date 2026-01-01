# Bugs to Fix

## 1. Write Review - Sign In Modal
**Issue:** When you click 'write review' and you are signed out, it should launch the sign in modal

**Current Behavior:** Shows a login prompt message for 3 seconds

**Expected Behavior:** Open the sign-in modal instead

**Location:** `components/detail/ShopReviewsSection.tsx`

---

## 2. Show Drawer - Horizontal Padding
**Issue:** The top part of the show drawer has lost its horizontal padding, around the name area

**Location:** `components/detail/ShopDrawer.tsx` / `components/detail/ShopHeader.tsx`

---

## 3. Location Panel - Close Button Not Working
**Issue:** If a location is active in the right hand panel, if you click close, it does not close the panel. It should close and give you more space to see the map.

**Current Behavior:** Close button does not close the location panel

**Expected Behavior:** Close button should close the panel and show more of the map

**Location:** `components/detail/LocationDrawer.tsx`

---

## 4. Location Name - Missing Custom Font
**Issue:** Location name in the drawer does not have the custom font attached

**Location:** `components/detail/LocationDrawer.tsx`

---

## 5. Custom Font - Make Reusable Token
**Issue:** The custom font we use should be a reusable token so we can change it quickly

**Action:** Create a font token/variable that can be reused across the application

---

## 6. Left Panel Select - Missing Initial Background
**Issue:** The select in the left hand panel only gets a BG when it's hovered, it needs a BG in the initial state (is just white atm)

**Current Behavior:** Select has no background until hovered

**Expected Behavior:** Select should have a background in its initial/default state

---

## 7. Address Truncation - Show More Text
**Issue:** We can show a little bit more of the first bit of the address before truncating

**Action:** Adjust truncation point to show more of the address text

---

## 8. Standardize Close Buttons - Create Reusable Circular Component
**Issue:** We need to standardize all close buttons so it's reusable, make it a circular one

**Action:** Create a reusable circular close button component and replace all existing close buttons

---

## 9. Shop Drawer Transition - Fix Flashing/Sliding Animation
**Issue:** If you already have a shop drawer open and click another one, the other one slides in and flashes, needs to look a lot neater than that

**Current Behavior:** Drawer slides in with a flash effect when switching between shops

**Expected Behavior:** Smooth, clean transition between shop drawers without flashing

**Location:** `components/detail/ShopDrawer.tsx`

---

## 10. Mobile Menu/Close Button - Add Safe Area Padding
**Issue:** On mobile the menu/close button needs to be a safe space, with more padding above it when it's open in the surface as the filter logo is covered by the close button, needs safe area around it

**Current Behavior:** Close button covers the filter logo on mobile

**Expected Behavior:** Menu/close button should have safe area padding to avoid covering the logo

---

## 11. Mobile Sign In Button - Z-Index/Menu Layer Issue
**Issue:** Sign in button doesn't work on mobile, assume a z-index issue as the menu is too high, this needs real rethinking

**Current Behavior:** Sign in button is not clickable on mobile (likely covered by menu layer)

**Expected Behavior:** Sign in button should be clickable and properly layered

**Action:** Rethink mobile menu z-index layering structure

---

## 12. Mobile Destination Navigation - Don't Auto-Open City Guide
**Issue:** When you go to a destination on mobile you should not go to the city guide sheet, it should just show the left hand panel with the shops. We will have a custom element in there saying "see city guide" on mobile that would then launch it up if needed.

**Current Behavior:** Navigating to a destination automatically opens the city guide sheet on mobile

**Expected Behavior:** Show left panel with shops instead, with a custom "see city guide" element that launches it when needed

**Action:**
1. Prevent auto-opening city guide sheet on mobile destination navigation
2. Add custom "see city guide" element to mobile left panel

---

## 13. Mobile City Guide Sheet - Cannot Scroll
**Issue:** Cannot scroll the mobile city guide sheet - needs to fill the whole screen and be able to scroll it

**Current Behavior:** City guide sheet is not scrollable on mobile

**Expected Behavior:** Sheet should fill the whole screen and be scrollable

**Location:** `components/detail/LocationDrawer.tsx`

---

## 14. Mobile Fixed Footer - Move Privacy/Terms to Drawer Menu
**Issue:** On mobile review the fixed privacy/terms footer - move that content into the drawer menu, it's blocking the screen unnecessarily

**Current Behavior:** Privacy/terms footer is fixed at bottom and blocking screen on mobile

**Expected Behavior:** Move privacy/terms content into the drawer menu instead

**Action:** Remove fixed footer on mobile and add privacy/terms links to drawer menu

---

## 15. Mobile Map Pins - Z-Index Over Left Sheet Content
**Issue:** Map pins come over the screen on mobile, seem to have higher z-index than the left hand sheet content

**Current Behavior:** Map pins appear over the left sheet content on mobile

**Expected Behavior:** Left sheet content should be above map pins

**Action:** Adjust z-index layering so left sheet is above map pins

---

## 16. Shop List Active States - Too Bold and Exceeding Container Width
**Issue:** These active states need to be improved - more subtle and should not exceed width of that container

**Current Behavior:** Active state styling is too prominent and extends beyond container width

**Expected Behavior:** More subtle active states that stay within container boundaries

**Action:** Refine active state styling for shop list items

---

## 17. Reviews Not Displaying - Use Filter-Expo Review Cards
**Issue:** We are not pulling in reviews currently that we are in the filter-expo project. We should be using the same review style cards to display reviews from other users.

**Current Behavior:** Reviews are not being displayed

**Expected Behavior:** Display reviews using the same review card style from filter-expo project

**Action:**
1. Pull in reviews data
2. Implement review cards matching filter-expo style

**Location:** `components/detail/ShopReviewsSection.tsx` / `components/reviews/`

---

## 18. Shop Hours - Not Displaying Properly for Days of Week
**Issue:** Shop hours arrays not displaying properly at the moment for the days of the week

**Current Behavior:** Days are showing only numbers (7, 7, 7, 8, 8) instead of formatted hours

**Expected Behavior:** Display proper formatted hours for each day of the week

**Action:** Fix hours array parsing/display logic

**Location:** `components/detail/ShopInfo.tsx` or opening hours component

---

## 19. Directions - Use Place Name Instead of Coordinates
**Issue:** When you go to directions we should add the search terms into the google maps parameter so it doesn't send you to the coordinates but the actual place

**Current Behavior:** Directions link uses coordinates

**Expected Behavior:** Use place name/search terms in Google Maps parameter for better navigation

**Action:** Update directions link to include place name instead of just coordinates

**Location:** `components/detail/ActionBar.tsx` or maps link component

---

## 20. Add Search Functionality - Modal for Shops/Destinations
**Issue:** Need to add in a search functionality, perhaps to the left of the sign in button. Click it and get a modal where you can search for shops or destinations.

**Current Behavior:** No search functionality available

**Expected Behavior:** Search button (left of sign in) that opens modal to search shops or destinations

**Action:**
1. Add search button to header (left of sign in button)
2. Create search modal component
3. Implement search logic for shops and destinations

**Location:** `components/layout/MainLayout.tsx` and new search modal component

---
