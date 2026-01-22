// Country center coordinates by ISO 3166-1 alpha-2 code
// Used for centering the map when we detect a visitor's country

type CountryCoords = {
  center: [number, number]; // [longitude, latitude]
  zoom: number;
};

// Map of supported countries with approximate center points and zoom levels
const COUNTRY_COORDINATES: Record<string, CountryCoords> = {
  // Asia
  JP: { center: [138.2529, 36.2048], zoom: 5 },     // Japan
  TH: { center: [100.9925, 15.8700], zoom: 5.5 },   // Thailand
  KR: { center: [127.7669, 35.9078], zoom: 6 },     // South Korea
  SG: { center: [103.8198, 1.3521], zoom: 10 },     // Singapore
  MY: { center: [101.9758, 4.2105], zoom: 5.5 },    // Malaysia
  ID: { center: [113.9213, -0.7893], zoom: 4 },     // Indonesia
  VN: { center: [108.2772, 14.0583], zoom: 5 },     // Vietnam
  PH: { center: [121.7740, 12.8797], zoom: 5 },     // Philippines
  TW: { center: [120.9605, 23.6978], zoom: 7 },     // Taiwan
  HK: { center: [114.1694, 22.3193], zoom: 10 },    // Hong Kong
  CN: { center: [104.1954, 35.8617], zoom: 4 },     // China
  IN: { center: [78.9629, 20.5937], zoom: 4.5 },    // India
  KG: { center: [74.7661, 41.2044], zoom: 6 },      // Kyrgyzstan

  // Europe
  GB: { center: [-3.4360, 55.3781], zoom: 5 },      // United Kingdom
  DE: { center: [10.4515, 51.1657], zoom: 5.5 },    // Germany
  FR: { center: [2.2137, 46.2276], zoom: 5 },       // France
  IT: { center: [12.5674, 41.8719], zoom: 5 },      // Italy
  ES: { center: [-3.7492, 40.4637], zoom: 5 },      // Spain
  PT: { center: [-8.2245, 39.3999], zoom: 6 },      // Portugal
  NL: { center: [5.2913, 52.1326], zoom: 7 },       // Netherlands
  BE: { center: [4.4699, 50.5039], zoom: 7 },       // Belgium
  AT: { center: [14.5501, 47.5162], zoom: 6 },      // Austria
  CH: { center: [8.2275, 46.8182], zoom: 7 },       // Switzerland
  SE: { center: [18.6435, 60.1282], zoom: 4.5 },    // Sweden
  NO: { center: [8.4689, 60.4720], zoom: 4.5 },     // Norway
  DK: { center: [9.5018, 56.2639], zoom: 6 },       // Denmark
  FI: { center: [25.7482, 61.9241], zoom: 5 },      // Finland
  PL: { center: [19.1451, 51.9194], zoom: 5.5 },    // Poland
  CZ: { center: [15.4729, 49.8175], zoom: 6.5 },    // Czech Republic
  IE: { center: [-8.2439, 53.4129], zoom: 6 },      // Ireland
  GR: { center: [21.8243, 39.0742], zoom: 6 },      // Greece
  TR: { center: [35.2433, 38.9637], zoom: 5 },      // Turkey

  // Americas
  US: { center: [-95.7129, 37.0902], zoom: 3.5 },   // United States
  CA: { center: [-106.3468, 56.1304], zoom: 3 },    // Canada
  MX: { center: [-102.5528, 23.6345], zoom: 4.5 },  // Mexico
  BR: { center: [-51.9253, -14.2350], zoom: 3.5 },  // Brazil
  AR: { center: [-63.6167, -38.4161], zoom: 4 },    // Argentina
  CL: { center: [-71.5430, -35.6751], zoom: 4 },    // Chile
  CO: { center: [-74.2973, 4.5709], zoom: 5 },      // Colombia
  PE: { center: [-75.0152, -9.1900], zoom: 5 },     // Peru

  // Oceania
  AU: { center: [133.7751, -25.2744], zoom: 3.5 },  // Australia
  NZ: { center: [174.8860, -40.9006], zoom: 5 },    // New Zealand

  // Middle East & Africa
  AE: { center: [53.8478, 23.4241], zoom: 6 },      // UAE
  SA: { center: [45.0792, 23.8859], zoom: 5 },      // Saudi Arabia
  IL: { center: [34.8516, 31.0461], zoom: 7 },      // Israel
  ZA: { center: [22.9375, -30.5595], zoom: 5 },     // South Africa
  EG: { center: [30.8025, 26.8206], zoom: 5 },      // Egypt
  KE: { center: [37.9062, -0.0236], zoom: 5.5 },    // Kenya
};

/**
 * Get the center coordinates and zoom level for a country
 * @param countryCode ISO 3166-1 alpha-2 country code (e.g., "JP", "TH", "GB")
 * @returns Center coordinates and zoom level, or null if not found
 */
export function getCountryCoordinates(countryCode: string | null | undefined): CountryCoords | null {
  if (!countryCode) return null;
  return COUNTRY_COORDINATES[countryCode.toUpperCase()] || null;
}
