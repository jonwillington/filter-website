/**
 * Google Places Matching Script
 *
 * Matches shops in Strapi to Google Place IDs for reliable coordinates and Maps links.
 *
 * USAGE:
 *   npx ts-node scripts/match-google-places.ts --dry-run              # Preview matches without saving
 *   npx ts-node scripts/match-google-places.ts --limit 10             # Process only 10 shops
 *   npx ts-node scripts/match-google-places.ts --city "Berlin"        # Process shops in Berlin only
 *   npx ts-node scripts/match-google-places.ts --confidence 80        # Only save matches above 80% confidence
 *   npx ts-node scripts/match-google-places.ts --resume               # Resume from last processed shop
 *   npx ts-node scripts/match-google-places.ts --export results.csv   # Export results to CSV
 *
 * REQUIRED ENV VARS:
 *   GOOGLE_PLACES_API_KEY   - Your Google Places API key
 *   STRAPI_URL              - Strapi API URL (defaults to NEXT_PUBLIC_STRAPI_URL)
 *   STRAPI_TOKEN            - Strapi API token (defaults to NEXT_PUBLIC_STRAPI_TOKEN)
 *
 * COST NOTES:
 *   - Uses Text Search (New) API with minimal fields for lowest cost
 *   - Requests only: place ID, location, displayName
 *   - Estimated cost: ~$0.004-0.006 per request
 *   - 500 shops ≈ $2-3 total
 */

import * as fs from 'fs';
import * as path from 'path';

// Types
interface Shop {
  id: number;
  documentId: string;
  name: string;
  address?: string | null;
  coordinates?: { lat: number; lng: number } | null;
  latitude?: number | null;
  longitude?: number | null;
  google_place_id?: string | null;
  google_place_verified?: boolean;
  city_area?: {
    name?: string;
    location?: {
      name?: string;
      country?: {
        name?: string;
      };
    };
  };
  location?: {
    name?: string;
    country?: {
      name?: string;
    };
  };
}

interface GooglePlace {
  id: string;
  displayName?: { text: string };
  location?: { latitude: number; longitude: number };
  formattedAddress?: string;
}

interface MatchResult {
  shopId: number;
  shopDocumentId: string;
  shopName: string;
  shopAddress: string | null;
  placeId: string | null;
  placeName: string | null;
  placeAddress: string | null;
  confidence: number;
  distanceMeters: number | null;
  status: 'matched' | 'low_confidence' | 'not_found' | 'already_mapped' | 'error';
  error?: string;
}

interface ProgressState {
  lastProcessedId: number | null;
  processedCount: number;
  matchedCount: number;
  timestamp: string;
}

// Configuration
const CONFIG = {
  // API endpoints
  GOOGLE_PLACES_URL: 'https://places.googleapis.com/v1/places:searchText',

  // Rate limiting
  DELAY_BETWEEN_REQUESTS_MS: 100, // 100ms between requests
  BATCH_SIZE: 50, // Process in batches of 50

  // Matching thresholds
  AUTO_VERIFY_CONFIDENCE: 90, // Auto-verify matches above this %
  MIN_SAVE_CONFIDENCE: 70, // Only save matches above this %
  MAX_DISTANCE_METERS: 500, // Max distance from existing coords to consider a match

  // File paths
  PROGRESS_FILE: 'scripts/.google-places-progress.json',
  RESULTS_FILE: 'scripts/google-places-results.json',
};

// Parse command line arguments
function parseArgs(): {
  dryRun: boolean;
  limit: number | null;
  city: string | null;
  confidence: number;
  resume: boolean;
  export: string | null;
  skipMapped: boolean;
} {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    limit: args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : null,
    city: args.includes('--city') ? args[args.indexOf('--city') + 1] : null,
    confidence: args.includes('--confidence')
      ? parseInt(args[args.indexOf('--confidence') + 1])
      : CONFIG.MIN_SAVE_CONFIDENCE,
    resume: args.includes('--resume'),
    export: args.includes('--export') ? args[args.indexOf('--export') + 1] : null,
    skipMapped: !args.includes('--include-mapped'),
  };
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Calculate Levenshtein distance for string similarity
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]) + 1;
      }
    }
  }

  return dp[m][n];
}

// Calculate string similarity (0-100)
function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 100;

  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 100;

  const distance = levenshteinDistance(s1, s2);
  return Math.round(((maxLen - distance) / maxLen) * 100);
}

// Build search query for a shop
function buildSearchQuery(shop: Shop): string {
  const parts: string[] = [];

  // Shop name is essential
  parts.push(shop.name);

  // Add city/area for disambiguation
  const cityArea = shop.city_area;
  const location = shop.location || cityArea?.location;

  if (cityArea?.name) {
    parts.push(cityArea.name);
  }

  if (location?.name) {
    parts.push(location.name);
  }

  // Add country for international accuracy
  const country = location?.country?.name;
  if (country) {
    parts.push(country);
  }

  // "coffee" helps Google understand business type
  parts.push('coffee');

  return parts.join(', ');
}

// Get shop coordinates
function getShopCoords(shop: Shop): { lat: number; lng: number } | null {
  if (shop.coordinates?.lat && shop.coordinates?.lng) {
    return shop.coordinates;
  }
  if (shop.latitude && shop.longitude) {
    return { lat: shop.latitude, lng: shop.longitude };
  }
  return null;
}

// Calculate match confidence
function calculateConfidence(
  shop: Shop,
  place: GooglePlace,
  distanceMeters: number | null
): number {
  let confidence = 0;

  // Name similarity (0-50 points)
  if (place.displayName?.text) {
    const nameSimilarity = stringSimilarity(shop.name, place.displayName.text);
    confidence += (nameSimilarity / 100) * 50;
  }

  // Distance score (0-40 points) - closer is better
  if (distanceMeters !== null) {
    if (distanceMeters < 50) {
      confidence += 40;
    } else if (distanceMeters < 100) {
      confidence += 35;
    } else if (distanceMeters < 200) {
      confidence += 25;
    } else if (distanceMeters < 500) {
      confidence += 15;
    } else if (distanceMeters < 1000) {
      confidence += 5;
    }
    // Beyond 1000m gets 0 distance points
  } else {
    // No existing coordinates - give partial credit if name matches well
    confidence += 10;
  }

  // Bonus for exact name match (10 points)
  if (
    place.displayName?.text &&
    shop.name.toLowerCase().trim() === place.displayName.text.toLowerCase().trim()
  ) {
    confidence += 10;
  }

  return Math.min(100, Math.round(confidence));
}

// Search Google Places for a shop
async function searchGooglePlace(
  shop: Shop,
  apiKey: string
): Promise<{ place: GooglePlace | null; error?: string }> {
  const query = buildSearchQuery(shop);
  const shopCoords = getShopCoords(shop);

  const requestBody: Record<string, unknown> = {
    textQuery: query,
    maxResultCount: 1,
  };

  // Add location bias if we have coordinates
  if (shopCoords) {
    requestBody.locationBias = {
      circle: {
        center: {
          latitude: shopCoords.lat,
          longitude: shopCoords.lng,
        },
        radius: 500, // 500 meter radius
      },
    };
  }

  try {
    const response = await fetch(CONFIG.GOOGLE_PLACES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        // Request only essential fields for minimum cost
        'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.formattedAddress',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { place: null, error: `API Error ${response.status}: ${errorText}` };
    }

    const data = await response.json();

    if (!data.places || data.places.length === 0) {
      return { place: null };
    }

    return { place: data.places[0] };
  } catch (error) {
    return { place: null, error: `Network error: ${error}` };
  }
}

// Fetch all shops from Strapi
async function fetchShops(strapiUrl: string, strapiToken: string): Promise<Shop[]> {
  const allShops: Shop[] = [];
  let page = 1;
  let pageCount = 1;

  console.log('📦 Fetching shops from Strapi...');

  while (page <= pageCount) {
    const url = `${strapiUrl}/shops?populate[city_area][populate][location][populate][country]=*&populate[location][populate][country]=*&pagination[pageSize]=100&pagination[page]=${page}`;

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${strapiToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Strapi API Error: ${response.statusText}`);
    }

    const json = await response.json();
    allShops.push(...(json.data || []));

    pageCount = json.meta?.pagination?.pageCount || 1;
    console.log(`   Page ${page}/${pageCount} - ${allShops.length} shops loaded`);
    page++;
  }

  return allShops;
}

// Update shop in Strapi
async function updateShopInStrapi(
  shopDocumentId: string,
  placeId: string,
  confidence: number,
  placeLocation: { latitude: number; longitude: number } | undefined,
  strapiUrl: string,
  strapiToken: string
): Promise<boolean> {
  const updateData: Record<string, unknown> = {
    data: {
      google_place_id: placeId,
      google_place_verified: confidence >= CONFIG.AUTO_VERIFY_CONFIDENCE,
      google_place_last_sync: new Date().toISOString(),
      google_place_match_confidence: confidence,
    },
  };

  // Update coordinates if we got them from Google
  if (placeLocation) {
    updateData.data = {
      ...(updateData.data as object),
      coordinates: {
        lat: placeLocation.latitude,
        lng: placeLocation.longitude,
      },
    };
  }

  try {
    const response = await fetch(`${strapiUrl}/shops/${shopDocumentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${strapiToken}`,
      },
      body: JSON.stringify(updateData),
    });

    return response.ok;
  } catch (error) {
    console.error(`Failed to update shop ${shopDocumentId}:`, error);
    return false;
  }
}

// Save progress for resumability
function saveProgress(state: ProgressState): void {
  fs.writeFileSync(
    path.join(process.cwd(), CONFIG.PROGRESS_FILE),
    JSON.stringify(state, null, 2)
  );
}

// Load progress
function loadProgress(): ProgressState | null {
  const progressPath = path.join(process.cwd(), CONFIG.PROGRESS_FILE);
  if (fs.existsSync(progressPath)) {
    return JSON.parse(fs.readFileSync(progressPath, 'utf-8'));
  }
  return null;
}

// Export results to CSV
function exportToCSV(results: MatchResult[], filename: string): void {
  const headers = [
    'Shop ID',
    'Shop Document ID',
    'Shop Name',
    'Shop Address',
    'Place ID',
    'Place Name',
    'Place Address',
    'Confidence',
    'Distance (m)',
    'Status',
    'Error',
  ];

  const rows = results.map((r) => [
    r.shopId,
    r.shopDocumentId,
    `"${r.shopName.replace(/"/g, '""')}"`,
    r.shopAddress ? `"${r.shopAddress.replace(/"/g, '""')}"` : '',
    r.placeId || '',
    r.placeName ? `"${r.placeName.replace(/"/g, '""')}"` : '',
    r.placeAddress ? `"${r.placeAddress.replace(/"/g, '""')}"` : '',
    r.confidence,
    r.distanceMeters ?? '',
    r.status,
    r.error ? `"${r.error.replace(/"/g, '""')}"` : '',
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  fs.writeFileSync(path.join(process.cwd(), filename), csv);
}

// Sleep helper
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Main execution
async function main() {
  const args = parseArgs();

  console.log('\n🔍 Google Places Matching Script');
  console.log('================================\n');

  // Check for API key
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: GOOGLE_PLACES_API_KEY environment variable is required');
    console.log('\nSet it with:');
    console.log('  export GOOGLE_PLACES_API_KEY="your-api-key"');
    process.exit(1);
  }

  // Get Strapi config
  const strapiUrl =
    process.env.STRAPI_URL ||
    process.env.NEXT_PUBLIC_STRAPI_URL ||
    'https://helpful-oasis-8bb949e05d.strapiapp.com/api';
  const strapiToken =
    process.env.STRAPI_TOKEN || process.env.NEXT_PUBLIC_STRAPI_TOKEN;

  if (!strapiToken) {
    console.error('❌ Error: STRAPI_TOKEN environment variable is required');
    process.exit(1);
  }

  // Show configuration
  console.log('📋 Configuration:');
  console.log(`   Dry run: ${args.dryRun ? 'Yes (no changes will be saved)' : 'No'}`);
  console.log(`   Limit: ${args.limit ?? 'None'}`);
  console.log(`   City filter: ${args.city ?? 'None'}`);
  console.log(`   Min confidence: ${args.confidence}%`);
  console.log(`   Skip already mapped: ${args.skipMapped ? 'Yes' : 'No'}`);
  console.log(`   Resume from progress: ${args.resume ? 'Yes' : 'No'}`);
  console.log('');

  // Fetch shops
  let shops = await fetchShops(strapiUrl, strapiToken);
  console.log(`\n📍 Total shops in database: ${shops.length}`);

  // Filter by city if specified
  if (args.city) {
    shops = shops.filter((shop) => {
      const locationName = shop.location?.name || shop.city_area?.location?.name;
      return locationName?.toLowerCase().includes(args.city!.toLowerCase());
    });
    console.log(`   Filtered to ${shops.length} shops in "${args.city}"`);
  }

  // Skip already mapped shops
  if (args.skipMapped) {
    shops = shops.filter((shop) => !shop.google_place_id);
    console.log(`   ${shops.length} shops without Place ID`);
  }

  // Load progress if resuming
  let startIndex = 0;
  if (args.resume) {
    const progress = loadProgress();
    if (progress?.lastProcessedId) {
      const lastIndex = shops.findIndex((s) => s.id === progress.lastProcessedId);
      if (lastIndex >= 0) {
        startIndex = lastIndex + 1;
        console.log(`   Resuming from shop #${startIndex + 1}`);
      }
    }
  }

  // Apply limit
  if (args.limit) {
    shops = shops.slice(startIndex, startIndex + args.limit);
  } else if (startIndex > 0) {
    shops = shops.slice(startIndex);
  }

  console.log(`   Processing ${shops.length} shops\n`);

  if (shops.length === 0) {
    console.log('✅ No shops to process!');
    return;
  }

  // Estimate cost
  const estimatedCost = shops.length * 0.005; // ~$0.005 per request
  console.log(`💰 Estimated API cost: ~$${estimatedCost.toFixed(2)}`);
  console.log('   (Based on Text Search with minimal fields)\n');

  // Process shops
  const results: MatchResult[] = [];
  let matchedCount = 0;
  let lowConfidenceCount = 0;
  let notFoundCount = 0;
  let errorCount = 0;

  for (let i = 0; i < shops.length; i++) {
    const shop = shops[i];
    const progress = `[${i + 1}/${shops.length}]`;

    process.stdout.write(`${progress} ${shop.name}... `);

    // Search Google Places
    const { place, error } = await searchGooglePlace(shop, apiKey);

    if (error) {
      console.log(`❌ Error: ${error}`);
      results.push({
        shopId: shop.id,
        shopDocumentId: shop.documentId,
        shopName: shop.name,
        shopAddress: shop.address || null,
        placeId: null,
        placeName: null,
        placeAddress: null,
        confidence: 0,
        distanceMeters: null,
        status: 'error',
        error,
      });
      errorCount++;
      await sleep(CONFIG.DELAY_BETWEEN_REQUESTS_MS);
      continue;
    }

    if (!place) {
      console.log('❌ Not found');
      results.push({
        shopId: shop.id,
        shopDocumentId: shop.documentId,
        shopName: shop.name,
        shopAddress: shop.address || null,
        placeId: null,
        placeName: null,
        placeAddress: null,
        confidence: 0,
        distanceMeters: null,
        status: 'not_found',
      });
      notFoundCount++;
      await sleep(CONFIG.DELAY_BETWEEN_REQUESTS_MS);
      continue;
    }

    // Calculate distance if we have coordinates
    let distanceMeters: number | null = null;
    const shopCoords = getShopCoords(shop);
    if (shopCoords && place.location) {
      distanceMeters = calculateDistance(
        shopCoords.lat,
        shopCoords.lng,
        place.location.latitude,
        place.location.longitude
      );
    }

    // Calculate confidence
    const confidence = calculateConfidence(shop, place, distanceMeters);

    const result: MatchResult = {
      shopId: shop.id,
      shopDocumentId: shop.documentId,
      shopName: shop.name,
      shopAddress: shop.address || null,
      placeId: place.id,
      placeName: place.displayName?.text || null,
      placeAddress: place.formattedAddress || null,
      confidence,
      distanceMeters: distanceMeters ? Math.round(distanceMeters) : null,
      status: confidence >= args.confidence ? 'matched' : 'low_confidence',
    };

    results.push(result);

    if (confidence >= args.confidence) {
      const distanceInfo = distanceMeters ? ` (${Math.round(distanceMeters)}m)` : '';
      console.log(`✅ ${confidence}% - ${place.displayName?.text}${distanceInfo}`);

      // Save to Strapi if not dry run
      if (!args.dryRun) {
        const updated = await updateShopInStrapi(
          shop.documentId,
          place.id,
          confidence,
          place.location,
          strapiUrl,
          strapiToken
        );
        if (!updated) {
          console.log('   ⚠️ Failed to save to Strapi');
        }
      }

      matchedCount++;
    } else {
      console.log(`⚠️ ${confidence}% (below ${args.confidence}% threshold)`);
      lowConfidenceCount++;
    }

    // Save progress
    saveProgress({
      lastProcessedId: shop.id,
      processedCount: i + 1,
      matchedCount,
      timestamp: new Date().toISOString(),
    });

    // Rate limiting
    await sleep(CONFIG.DELAY_BETWEEN_REQUESTS_MS);
  }

  // Summary
  console.log('\n================================');
  console.log('📊 Summary:');
  console.log(`   Total processed: ${shops.length}`);
  console.log(`   ✅ Matched: ${matchedCount}`);
  console.log(`   ⚠️ Low confidence: ${lowConfidenceCount}`);
  console.log(`   ❌ Not found: ${notFoundCount}`);
  console.log(`   💥 Errors: ${errorCount}`);
  console.log('');

  if (args.dryRun) {
    console.log('🔍 This was a DRY RUN - no changes were saved to Strapi');
  } else {
    console.log(`💾 Saved ${matchedCount} matches to Strapi`);
  }

  // Save results JSON
  fs.writeFileSync(
    path.join(process.cwd(), CONFIG.RESULTS_FILE),
    JSON.stringify(results, null, 2)
  );
  console.log(`\n📄 Results saved to ${CONFIG.RESULTS_FILE}`);

  // Export to CSV if requested
  if (args.export) {
    exportToCSV(results, args.export);
    console.log(`📄 CSV exported to ${args.export}`);
  }

  // Cleanup progress file if completed
  const progressPath = path.join(process.cwd(), CONFIG.PROGRESS_FILE);
  if (fs.existsSync(progressPath) && !args.resume) {
    fs.unlinkSync(progressPath);
  }

  console.log('\n✨ Done!\n');
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
