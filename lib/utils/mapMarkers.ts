import { Shop } from '../types';
import { getMediaUrl } from '../utils';

/**
 * Configuration for marker appearance based on theme
 */
export interface MarkerThemeConfig {
  isDark: boolean;
  labelBg: string;
  labelText: string;
  shimmerGradient: string;
}

/**
 * Get theme-aware colors for markers
 */
export function getMarkerThemeConfig(effectiveTheme: 'light' | 'dark'): MarkerThemeConfig {
  const isDark = effectiveTheme === 'dark';
  return {
    isDark,
    labelBg: isDark ? '#251C16' : 'white',
    labelText: isDark ? '#FAF7F5' : '#1a1a1a',
    shimmerGradient: isDark
      ? 'linear-gradient(135deg, #2E2219 0%, #3D2E25 50%, #2E2219 100%)'
      : 'linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 50%, #f0f0f0 100%)',
  };
}

// Density and zoom thresholds for marker display
const HIGH_DENSITY_THRESHOLD = 30;
const ZOOM_THRESHOLD = 15; // Below this zoom, always use simple markers
const TEXT_ZOOM_THRESHOLD = 16.5; // Below this zoom, hide text labels (logo only)
const LOGO_ZOOM_THRESHOLD = 17; // Above this zoom, show logos even in high density areas

/**
 * Ensures the shimmer animation style is added to the document
 */
function ensureShimmerStyle(): void {
  if (!document.getElementById('marker-shimmer-style')) {
    const style = document.createElement('style');
    style.id = 'marker-shimmer-style';
    style.textContent = `
      @keyframes shimmer {
        0% { background-position: 200% 200%; }
        100% { background-position: -200% -200%; }
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Get the country color for a shop
 */
export function getShopCountryColor(shop: Shop): string {
  return (
    shop.location?.country?.primaryColor ||
    shop.city_area?.location?.country?.primaryColor ||
    '#FF6B6B'
  );
}

/**
 * Calculate marker size based on zoom level
 */
function getMarkerSizeForZoom(zoomLevel: number): { size: number; borderWidth: number } {
  if (zoomLevel < 3) {
    return { size: 8, borderWidth: 1 };
  } else if (zoomLevel < 5) {
    return { size: 10, borderWidth: 1.5 };
  } else if (zoomLevel < 7) {
    return { size: 14, borderWidth: 1.5 };
  } else if (zoomLevel < 10) {
    return { size: 18, borderWidth: 2 };
  }
  return { size: 22, borderWidth: 2 };
}

/**
 * Create a simple circular marker element (for high density / zoomed out views)
 */
function createSimpleMarkerElement(
  shop: Shop,
  isSelected: boolean,
  fadeIn: boolean,
  zoomLevel: number
): HTMLDivElement {
  const el = document.createElement('div');
  el.className = `shop-marker${isSelected ? ' selected' : ''}`;

  const countryColor = getShopCountryColor(shop);
  const markerColor = isSelected ? '#8B6F47' : countryColor;
  const { size: markerSize, borderWidth } = getMarkerSizeForZoom(zoomLevel);

  el.style.cssText = `
    width: ${markerSize}px;
    height: ${markerSize}px;
    border-radius: 50%;
    background: ${markerColor};
    border: ${borderWidth}px solid white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    cursor: pointer;
    transition: background-color 0.2s ease, opacity 0.2s ease;
    opacity: ${fadeIn ? '0' : '1'};
    transform-origin: center center;
    position: absolute;
    transform: translate3d(0, 0, 0) ${isSelected ? 'scale(1.3)' : 'scale(1)'};
    contain: layout style paint;
  `;
  el.style.zIndex = isSelected ? '10' : '1';

  // Fade in after a brief delay if fadeIn is true
  if (fadeIn) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.opacity = '1';
      });
    });
  }

  return el;
}

/**
 * Create a detailed marker element with logo and optional text label
 * Selected markers are larger with a pointer showing exact location
 * All markers use center anchor, so we offset selected markers upward
 */
function createDetailedMarkerElement(
  shop: Shop,
  isSelected: boolean,
  fadeIn: boolean,
  themeConfig: MarkerThemeConfig,
  showLabel: boolean = true
): HTMLDivElement {
  const { labelBg, labelText, shimmerGradient } = themeConfig;
  const logoUrl = getMediaUrl(shop.brand?.logo);

  // Size based on selection state - selected is larger
  const logoSize = isSelected ? 48 : 32;
  const borderWidth = isSelected ? 3 : 2.5;
  const pointerHeight = 10;

  const container = document.createElement('div');
  container.className = `shop-marker${isSelected ? ' selected' : ''}`;

  // For selected markers, offset upward so pointer tip is at the anchor point
  // Total offset = half logo height + pointer height
  const offsetY = isSelected ? -(logoSize / 2 + pointerHeight) : 0;

  container.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    opacity: ${fadeIn ? '0' : '1'};
    transition: opacity 0.3s ease;
    transform: translateY(${offsetY}px);
  `;
  container.style.zIndex = isSelected ? '10' : '1';

  // Create logo circle
  const logoEl = document.createElement('div');
  logoEl.className = 'marker-logo';
  const baseStyles = `
    width: ${logoSize}px;
    height: ${logoSize}px;
    border-radius: 50%;
    border: ${borderWidth}px solid ${isSelected ? '#8B6F47' : 'white'};
    box-shadow: ${isSelected ? '0 4px 16px rgba(0,0,0,0.35)' : '0 2px 8px rgba(0,0,0,0.2)'};
    transition: all 0.3s ease;
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
    flex-shrink: 0;
  `;

  if (logoUrl) {
    // Start with loading state
    logoEl.style.cssText = `
      ${baseStyles}
      background: ${shimmerGradient};
      background-size: 200% 200%;
      animation: shimmer 1.5s ease-in-out infinite;
    `;

    ensureShimmerStyle();

    // Preload image and swap when ready
    const img = new Image();
    img.onload = () => {
      logoEl.style.backgroundImage = `url(${logoUrl})`;
      logoEl.style.backgroundSize = 'cover';
      logoEl.style.backgroundPosition = 'center';
      logoEl.style.backgroundColor = labelBg;
      logoEl.style.background = `url(${logoUrl}) center/cover ${labelBg}`;
      logoEl.style.animation = 'none';
    };
    img.src = logoUrl;
  } else {
    logoEl.innerHTML = '';
    logoEl.style.cssText = `
      ${baseStyles}
      background: ${labelBg};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${isSelected ? 20 : 14}px;
    `;
  }

  container.appendChild(logoEl);

  // Add pointer beneath selected marker to show exact location
  if (isSelected) {
    const pointer = document.createElement('div');
    pointer.className = 'marker-pointer';
    pointer.style.cssText = `
      width: 0;
      height: 0;
      border-left: 7px solid transparent;
      border-right: 7px solid transparent;
      border-top: ${pointerHeight}px solid #8B6F47;
      margin-top: -1px;
      filter: drop-shadow(0 2px 3px rgba(0,0,0,0.25));
    `;
    container.appendChild(pointer);
  }

  // Fade in after a brief delay if fadeIn is true
  if (fadeIn) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        container.style.opacity = '1';
      });
    });
  }

  return container;
}

/**
 * Create a marker element for a shop.
 * Chooses between simple (dot) and detailed (logo + label) based on zoom and density.
 */
export function createMarkerElement(
  shop: Shop,
  isSelected: boolean,
  effectiveTheme: 'light' | 'dark',
  options: {
    fadeIn?: boolean;
    density?: number;
    zoomLevel?: number;
  } = {}
): HTMLDivElement {
  const { fadeIn = false, density = 0, zoomLevel = 12 } = options;

  // Use simple markers if: zoomed out OR (high density AND not super zoomed in)
  const useSimpleMarker =
    zoomLevel < ZOOM_THRESHOLD ||
    (density > HIGH_DENSITY_THRESHOLD && zoomLevel < LOGO_ZOOM_THRESHOLD);

  if (useSimpleMarker) {
    return createSimpleMarkerElement(shop, isSelected, fadeIn, zoomLevel);
  } else {
    const themeConfig = getMarkerThemeConfig(effectiveTheme);
    // Only show text label when zoomed in past TEXT_ZOOM_THRESHOLD
    const showLabel = zoomLevel >= TEXT_ZOOM_THRESHOLD;
    return createDetailedMarkerElement(shop, isSelected, fadeIn, themeConfig, showLabel);
  }
}

/**
 * Update marker element styling without replacing it.
 * Used when selection state changes.
 */
export function updateMarkerStyle(
  el: HTMLElement,
  isSelected: boolean,
  shop?: Shop
): void {
  // Check if it's a container with children (logo + text label) or a simple marker
  const hasChildren = el.children.length > 0;
  // Simple markers have border-radius: 50% and no children
  const isSimpleMarker = !hasChildren && el.style.borderRadius === '50%';

  // Sizing constants (must match createDetailedMarkerElement)
  const selectedLogoSize = 48;
  const normalLogoSize = 32;
  const pointerHeight = 10;

  if (isSimpleMarker) {
    // Simple circular marker
    const countryColor = shop ? getShopCountryColor(shop) : '#FF6B6B';
    el.style.backgroundColor = isSelected ? '#8B6F47' : countryColor;
    el.style.transform = isSelected
      ? 'translate3d(0, 0, 0) scale(1.4)'
      : 'translate3d(0, 0, 0) scale(1)';
  } else if (hasChildren) {
    // Container with logo marker
    const logoEl = el.querySelector('.marker-logo') as HTMLElement;
    const existingPointer = el.querySelector('.marker-pointer');

    // Update container offset for pointer alignment
    const logoSize = isSelected ? selectedLogoSize : normalLogoSize;
    const offsetY = isSelected ? -(logoSize / 2 + pointerHeight) : 0;
    el.style.transform = `translateY(${offsetY}px)`;

    if (logoEl) {
      // Update logo size and styling
      const borderWidth = isSelected ? 3 : 2.5;
      logoEl.style.width = `${logoSize}px`;
      logoEl.style.height = `${logoSize}px`;
      logoEl.style.borderWidth = `${borderWidth}px`;
      logoEl.style.borderColor = isSelected ? '#8B6F47' : 'white';
      logoEl.style.boxShadow = isSelected
        ? '0 4px 16px rgba(0,0,0,0.35)'
        : '0 2px 8px rgba(0,0,0,0.2)';
    }

    // Add or remove pointer
    if (isSelected && !existingPointer) {
      const pointer = document.createElement('div');
      pointer.className = 'marker-pointer';
      pointer.style.cssText = `
        width: 0;
        height: 0;
        border-left: 7px solid transparent;
        border-right: 7px solid transparent;
        border-top: ${pointerHeight}px solid #8B6F47;
        margin-top: -1px;
        filter: drop-shadow(0 2px 3px rgba(0,0,0,0.25));
      `;
      el.appendChild(pointer);
    } else if (!isSelected && existingPointer) {
      existingPointer.remove();
    }
  } else {
    // Legacy single element logo marker
    el.style.borderColor = isSelected ? '#8B6F47' : 'white';
    el.style.transform = isSelected
      ? 'translate3d(0, 0, 0) scale(1.15)'
      : 'translate3d(0, 0, 0) scale(1)';
  }

  el.style.zIndex = isSelected ? '10' : '1';
  el.className = `shop-marker${isSelected ? ' selected' : ''}`;
}
