/**
 * Shared Strapi Populate Parameters
 *
 * Centralized definitions for populate parameters used across API modules.
 * This eliminates duplication and ensures consistency.
 */

// Brand fields that are commonly needed
export const BRAND_FIELDS = [
  'name',
  'type',
  'description',
  'story',
  'website',
  'phone',
  'instagram',
  'facebook',
  'tiktok',
  'has_wifi',
  'has_food',
  'has_outdoor_space',
  'is_pet_friendly',
  'has_espresso',
  'has_filter_coffee',
  'has_v60',
  'has_chemex',
  'has_aeropress',
  'has_french_press',
  'has_cold_brew',
  'has_batch_brew',
  'roastOwnBeans',
  'ownRoastDesc',
] as const;

// Media fields (logo, images)
export const MEDIA_FIELDS = ['url', 'formats'] as const;

// Country fields
export const COUNTRY_FIELDS = ['documentId', 'id', 'name', 'code'] as const;

/**
 * Build populate params for brand with all nested relations
 */
export function buildBrandPopulate(): string {
  const params: string[] = [];

  // Brand top-level fields
  BRAND_FIELDS.forEach((field, index) => {
    params.push(`populate[brand][fields][${index}]=${field}`);
  });

  // Brand logo
  params.push('populate[brand][populate][logo][fields][0]=url');
  params.push('populate[brand][populate][logo][fields][1]=formats');

  // Brand ownRoastCountry
  COUNTRY_FIELDS.forEach((field, index) => {
    params.push(`populate[brand][populate][ownRoastCountry][fields][${index}]=${field}`);
  });

  // Suppliers with deep populate
  params.push('populate[brand][populate][suppliers][populate][0]=logo');
  params.push('populate[brand][populate][suppliers][populate][1]=bg-image');
  params.push('populate[brand][populate][suppliers][populate][2]=country');
  params.push('populate[brand][populate][suppliers][populate][3]=ownRoastCountry');

  // Coffee partner with media
  params.push('populate[brand][populate][coffee_partner][populate][0]=logo');
  params.push('populate[brand][populate][coffee_partner][populate][1]=bg-image');
  params.push('populate[brand][populate][coffee_partner][populate][2]=country');

  return params.join('&');
}

/**
 * Build populate params for standalone brands fetch
 */
export function buildBrandsPopulate(): string {
  const params: string[] = [];

  // Logo
  params.push('populate[logo][fields][0]=url');
  params.push('populate[logo][fields][1]=formats');

  // Suppliers with nested media
  params.push('populate[suppliers][populate][logo][fields][0]=url');
  params.push('populate[suppliers][populate][logo][fields][1]=formats');
  params.push('populate[suppliers][populate][bg-image][fields][0]=url');
  params.push('populate[suppliers][populate][bg-image][fields][1]=formats');
  params.push('populate[suppliers][populate][country][fields][0]=name');
  params.push('populate[suppliers][populate][country][fields][1]=code');
  params.push('populate[suppliers][populate][ownRoastCountry][fields][0]=name');
  params.push('populate[suppliers][populate][ownRoastCountry][fields][1]=code');

  // Own roast country
  params.push('populate[ownRoastCountry][fields][0]=name');
  params.push('populate[ownRoastCountry][fields][1]=code');

  return params.join('&');
}

/**
 * Build populate params for shop images and gallery
 */
export function buildShopMediaPopulate(): string {
  return [
    'populate[featured_image]=*',
    'populate[gallery]=*',
  ].join('&');
}

/**
 * Build populate params for city_area with nested location
 */
export function buildCityAreaPopulate(): string {
  return [
    'populate[city_area]=*',
    'populate[city_area][populate][location]=*',
    'populate[city_area][populate][location][populate][country]=*',
    'populate[city_area][populate][location][populate][background_image]=*',
  ].join('&');
}

/**
 * Build populate params for direct location relation
 */
export function buildLocationPopulate(): string {
  return [
    'populate[location][populate][country]=*',
    'populate[location][populate][background_image]=*',
  ].join('&');
}

/**
 * Full shop populate params - combines all shop-related populates
 */
export const SHOP_POPULATE = [
  buildBrandPopulate(),
  buildShopMediaPopulate(),
  buildCityAreaPopulate(),
  buildLocationPopulate(),
].join('&');

/**
 * Location populate with country and background image
 */
export const LOCATION_POPULATE = [
  'populate[country]=*',
  'populate[background_image]=*',
].join('&');

/**
 * City area populate with location and nested relations
 */
export const CITY_AREA_POPULATE = [
  'populate[location]=*',
  'populate[location][populate][country]=*',
  'populate[location][populate][background_image]=*',
].join('&');
