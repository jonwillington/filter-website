/**
 * Filter API v3 — wire contract for the native apps.
 *
 * Served by `workers/api` at https://api.filter.coffee/v3/*.
 * The SwiftUI app mirrors these types by hand, so every change needs a note
 * in the PR description.
 *
 * Rules:
 * - Additive changes only. Removing or renaming a field, or changing its type,
 *   needs /v4: App Store builds can't be rolled back.
 * - Keys are camelCase. IDs are Strapi `documentId` strings.
 * - Every field is always present. Unknown values are `null`, never omitted.
 * - Timestamps are ISO 8601 UTC. Wall-clock times are "HH:mm" in the city's
 *   timezone (`City.timezone`).
 * - Records link to each other by ID. Nothing is copied in with a prefix.
 * - Only published, non-dev content is served.
 * - Every 200 response carries a strong ETag and honours If-None-Match (304).
 */

// ─── Envelope ─────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  meta: ApiMeta;
}

export interface ApiMeta {
  /** Content version the response was built from. Same value as the ETag. */
  version: string;
  /** When this response body was generated (ISO 8601). */
  generatedAt: string;
}

export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
  };
}

export type ApiErrorCode =
  | 'not_found'
  | 'bad_request'
  | 'method_not_allowed'
  | 'internal_error';

// ─── Shared shapes ────────────────────────────────────────────────────────────

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface Image {
  url: string;
  width: number | null;
  height: number | null;
  formats: ImageFormats;
}

export interface ImageFormats {
  thumbnail: ImageVariant | null;
  small: ImageVariant | null;
  medium: ImageVariant | null;
  large: ImageVariant | null;
}

export interface ImageVariant {
  url: string;
  width: number | null;
  height: number | null;
}

export interface SocialLinks {
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  twitter: string | null;
  youtube: string | null;
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface OpeningHours {
  /** Always seven entries, Monday first. */
  days: OpeningDay[];
}

export interface OpeningDay {
  weekday: Weekday;
  /**
   * - `open`: `ranges` has at least one entry
   * - `closed`: closed all day
   * - `open24h`: open all day
   * - `unknown`: no data for this day, or the source text couldn't be parsed
   */
  status: 'open' | 'closed' | 'open24h' | 'unknown';
  /** "HH:mm" in the city's timezone. A `close` at or before `open` means it closes after midnight. */
  ranges: TimeRange[];
  /** The source text for this day (e.g. "8:00 AM – 6:00 PM"), for display when `status` is `unknown`. */
  text: string | null;
}

export interface TimeRange {
  open: string;
  close: string;
}

// ─── Cities ───────────────────────────────────────────────────────────────────

/** GET /v3/cities */
export type CitiesResponse = ApiResponse<CityListItem[]>;

export interface CityListItem {
  id: string;
  slug: string;
  name: string;
  countryCode: string | null;
  shopCount: number;
}

/** GET /v3/cities/:city — `:city` is a slug (e.g. `istanbul`) or a documentId. */
export type CityResponse = ApiResponse<City>;

export interface City {
  id: string;
  slug: string;
  name: string;
  headline: string | null;
  /** Plain text. Paragraphs are separated by a blank line. */
  story: string | null;
  /** IANA timezone, e.g. "Europe/Istanbul". Opening hours are in this zone. */
  timezone: string | null;
  center: Coordinates | null;
  bounds: Bounds | null;
  /** Simplified outline (≤ ~150 points). `?boundaries=full` returns the source outline. */
  boundary: Coordinates[] | null;
  backgroundImage: Image | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  country: Country;
  cityAreas: CityArea[];
}

export interface Country {
  id: string;
  code: string | null;
  name: string;
  primaryColor: string | null;
  primaryColorDark: string | null;
  secondaryColor: string | null;
  secondaryColorDark: string | null;
  highInflation: boolean | null;
}

export interface CityArea {
  id: string;
  slug: string | null;
  name: string;
  /** e.g. "European Side", "Asian Side". */
  group: string | null;
  summary: string | null;
  center: Coordinates | null;
  bounds: Bounds | null;
  /** Simplified outline (≤ ~100 points). `?boundaries=full` returns the source outline. */
  boundary: Coordinates[] | null;
  shopCount: number;
}

// ─── Catalog (the main call) ──────────────────────────────────────────────────

/** GET /v3/cities/:city/catalog */
export type CatalogResponse = ApiResponse<Catalog>;

export interface Catalog {
  cityId: string;
  shops: ShopSummary[];
  /** Brands of this city's shops, plus their suppliers. */
  brands: BrandSummary[];
  /** Landmarks, museums, parks and ferry piers in this city. Most prominent first. Added 2026-09-24 (additive). */
  attractions: Attraction[];
}

export interface ShopSummary {
  id: string;
  slug: string | null;
  /** Full CMS name, e.g. "Kronotrop Moda - Istanbul". */
  name: string;
  /**
   * Branch name for chain shops, e.g. "Moda". Clients build the display name
   * from the brand: independent brand → brand name; other brand types →
   * "Brand · prefName" (or the brand name alone when this is null); no brand → `name`.
   * Added 2026-09-17 (additive).
   */
  prefName: string | null;
  brandId: string | null;
  cityId: string | null;
  cityAreaId: string | null;
  coordinates: Coordinates | null;
  address: string | null;
  heroImage: Image | null;
  openingHours: OpeningHours | null;
  /** Shop value, falling back to the brand's default. */
  amenities: Amenities;
  /** Shop value, falling back to the brand's default. */
  brewMethods: BrewMethods;
  recommendations: Recommendations;
  /** Editorial quality tier from the CMS, e.g. "verified", "full-process", "draft". */
  qualityTier: string | null;
  /** Taste-matching tags, e.g. { look: { minimal: 1 }, special: { roastery: 2 } }. */
  preferenceProfile: Record<string, Record<string, number>> | null;
  updatedAt: string | null;
}

export interface Amenities {
  wifi: boolean | null;
  food: boolean | null;
  outdoorSeating: boolean | null;
  petFriendly: boolean | null;
  oatMilk: boolean | null;
  plantMilk: boolean | null;
}

export interface BrewMethods {
  espresso: boolean | null;
  filter: boolean | null;
  v60: boolean | null;
  chemex: boolean | null;
  aeropress: boolean | null;
  frenchPress: boolean | null;
  coldBrew: boolean | null;
  batchBrew: boolean | null;
  siphon: boolean | null;
  turkishCoffee: boolean | null;
  slowBar: boolean | null;
}

export interface Recommendations {
  cityArea: boolean | null;
  cityAreaReason: string | null;
  working: boolean | null;
  interior: boolean | null;
  brewing: boolean | null;
}

export interface BrandSummary {
  id: string;
  name: string;
  /** "independent" | "smallChain" | "regionalChain" | … */
  type: string | null;
  /** 8–12 word headline. */
  statement: string | null;
  logo: Image | null;
  roastsOwnBeans: boolean | null;
  supplierIds: string[];
}

// ─── Shop detail ──────────────────────────────────────────────────────────────

/** GET /v3/shops/:id */
export type ShopResponse = ApiResponse<ShopDetail>;

export interface ShopDetail extends ShopSummary {
  description: string | null;
  neighbourhood: string | null;
  phone: string | null;
  /** Shop value, falling back to the brand's. */
  links: SocialLinks;
  googlePlaceId: string | null;
  gallery: Image[];
  menus: Menu[];
  brand: BrandSummary | null;
  cityArea: CityAreaRef | null;
  coffeePartner: CoffeePartner | null;
  /** Upcoming and ongoing events at this shop, soonest first. */
  events: Event[];
  /**
   * Up to 3 attractions within walking distance, most prominent first, then nearest.
   * Never across the water (the attraction's city-area group must match the shop's).
   * Added 2026-09-24 (additive).
   */
  nearbyAttractions: NearbyAttraction[];
}

export interface CityAreaRef {
  id: string;
  name: string;
  group: string | null;
}

export interface Menu {
  id: string;
  image: Image | null;
  isCurrent: boolean | null;
  validFrom: string | null;
  validTo: string | null;
  lastVerified: string | null;
}

export type AttractionCategory =
  | 'landmark'
  | 'religious'
  | 'palace'
  | 'museum'
  | 'market'
  | 'park'
  | 'street'
  | 'venue'
  | 'ferry';

export interface Attraction {
  id: string;
  /** English name, e.g. "Galata Tower". */
  name: string;
  /** Local-language name, e.g. "Galata Kulesi". */
  localName: string | null;
  slug: string | null;
  /** One of AttractionCategory. Clients should show a generic icon for values they don't know. */
  category: string | null;
  /** 1 = famous landmark, 2 = notable, 3 = local anchor. */
  prominence: number;
  cityId: string | null;
  cityAreaId: string | null;
  coordinates: Coordinates | null;
  /** Line along a long street or park edge. Distances use it when present. */
  outline: Coordinates[] | null;
  summary: string | null;
  image: Image | null;
  /** Photographer and licence, e.g. "A.Savin, FAL, via Wikimedia Commons". Show it wherever `image` is shown. Added 2026-09-25. */
  imageCredit: string | null;
  website: string | null;
}

export interface NearbyAttraction {
  id: string;
  name: string;
  localName: string | null;
  category: string | null;
  prominence: number;
  /** Straight-line distance, rounded to 10 m. */
  distanceMetres: number;
  /** Walking estimate: distance × 1.25 for street detours at 80 m a minute. At least 1. */
  walkMinutes: number;
}

export interface CoffeePartner {
  id: string;
  name: string;
  logo: Image | null;
  countryCode: string | null;
  primaryCategory: string | null;
  website: string | null;
  instagram: string | null;
}

// ─── Brand detail ─────────────────────────────────────────────────────────────

/** GET /v3/brands/:id */
export type BrandResponse = ApiResponse<BrandDetail>;

export interface BrandDetail extends BrandSummary {
  /** Plain text. Paragraphs are separated by a blank line. */
  story: string | null;
  description: string | null;
  founded: string | null;
  founder: string | null;
  hq: string | null;
  backgroundImage: Image | null;
  links: SocialLinks;
  ownRoastDescription: string | null;
  ownRoastCountries: CountryRef[];
  roastProfiles: { light: boolean | null; medium: boolean | null; dark: boolean | null };
  /** Free-form CMS JSON, e.g. { espresso: ["Victoria Arduino Eagle 1"], roasters: [] }. */
  equipment: Record<string, string[]> | null;
  beans: Bean[];
  suppliers: BrandSummary[];
  /** This brand's shops, grouped by city. */
  shopsByCity: BrandCityShops[];
}

export interface CountryRef {
  name: string | null;
  code: string | null;
}

export interface BrandCityShops {
  cityId: string | null;
  cityName: string | null;
  citySlug: string | null;
  shops: BrandShopRef[];
}

export interface BrandShopRef {
  id: string;
  name: string;
  /** Branch name, see ShopSummary.prefName. Added 2026-09-17 (additive). */
  prefName: string | null;
  cityAreaName: string | null;
  coordinates: Coordinates | null;
  heroImage: Image | null;
}

export interface Bean {
  id: string;
  name: string;
  slug: string | null;
  /** "single-origin" | "blend" */
  type: string | null;
  roastLevel: string | null;
  process: string | null;
  shortDescription: string | null;
  fullDescription: string | null;
  region: string | null;
  farm: string | null;
  producer: string | null;
  altitude: string | null;
  cuppingScore: number | null;
  /** Free-form CMS JSON for blends. */
  blendComponents: unknown | null;
  photo: Image | null;
  learnMoreUrl: string | null;
  origins: CountryRef[];
  flavorTags: FlavorTag[];
}

export interface FlavorTag {
  id: string | null;
  name: string;
}

// ─── Discover ─────────────────────────────────────────────────────────────────

/**
 * GET /v3/cities/:city/discover?events=20&news=20
 * Limits default to 20 and cap at 50.
 */
export type DiscoverResponse = ApiResponse<Discover>;

export interface Discover {
  cityId: string;
  /** Upcoming and ongoing events, soonest first. */
  events: Event[];
  /** People with at least one pick in this city, and those picks. */
  people: PersonWithPicks[];
  /** News mentioning this city, or a shop or brand in it, newest first. */
  news: NewsArticle[];
  /** Brands referenced by `events`, `people` and `news`. */
  brands: BrandSummary[];
}

export interface Event {
  id: string;
  name: string;
  description: string | null;
  /** "festival" | "conference" | "competition" | … */
  type: string | null;
  startsAt: string | null;
  endsAt: string | null;
  cityId: string | null;
  venue: string | null;
  website: string | null;
  isFree: boolean | null;
  ticketPrice: number | null;
  ticketsAvailable: boolean | null;
  image: Image | null;
  hostBrandId: string | null;
  shopIds: string[];
}

export interface Person {
  id: string;
  name: string;
  slug: string | null;
  bio: string | null;
  photo: Image | null;
  /** Role slugs, e.g. ["critic"]. */
  roles: string[];
  affiliation: string | null;
  affiliatedShopId: string | null;
  links: SocialLinks;
}

export interface PersonWithPicks extends Person {
  /** Picks for shops in the requested city, ordered by rank. */
  picks: PersonPick[];
}

export interface PersonPick {
  id: string;
  shopId: string;
  rank: number | null;
  description: string | null;
}

export interface NewsArticle {
  id: string;
  title: string;
  slug: string | null;
  statement: string | null;
  summary: string | null;
  /** "YYYY-MM-DD" */
  publishedDate: string | null;
  type: string | null;
  importance: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  author: string | null;
  image: Image | null;
  brandIds: string[];
  shopIds: string[];
  cityIds: string[];
}
