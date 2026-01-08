/**
 * Mock data utilities for dev mode
 * Stores fake data in localStorage to test UI without backend
 */

import { Review, UserBadges } from '@/lib/types/auth';
import { UserImage } from '@/lib/types';

const MOCK_REVIEWS_KEY = 'dev_mock_reviews';
const MOCK_PHOTOS_KEY = 'dev_mock_photos';
const MOCK_BADGES_KEY = 'dev_mock_badges';

// Sample data generators
const FAKE_NAMES = [
  'Sarah Johnson',
  'Mike Chen',
  'Emma Williams',
  'Alex Rodriguez',
  'Jordan Lee',
  'Taylor Brown',
  'Casey Martinez',
  'Morgan Davis',
];

const SAMPLE_COMMENTS = [
  'Amazing espresso! The baristas really know their craft.',
  'Great atmosphere and friendly service. Perfect spot for remote work.',
  'Best flat white I\'ve had in the city. Highly recommend!',
  'Cozy interior with excellent filter coffee. Will definitely come back.',
  'The V60 pour-over was exceptional. Love the attention to detail.',
  null,
  'Nice place but a bit crowded during peak hours.',
  'Outstanding quality beans and skilled baristas.',
];

const SAMPLE_TAGS = [
  ['pastries', 'cozy'],
  ['laptop-friendly', 'spacious'],
  ['fast-service'],
  ['quiet', 'good-music'],
  ['instagram-worthy', 'natural-light'],
  [],
  ['vintage-vibes'],
  ['specialty-coffee'],
];

// Sample coffee shop images from Unsplash
const SAMPLE_IMAGE_URLS = [
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80',
  'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&q=80',
  'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800&q=80',
  'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80',
  'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=800&q=80',
  'https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=800&q=80',
  'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800&q=80',
  'https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=800&q=80',
];

/**
 * Generate mock reviews for a shop
 */
function generateMockReviews(shopId: string, shopName: string, count: number = 3): Review[] {
  const reviews: Review[] = [];

  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * FAKE_NAMES.length);
    const userId = `dev-user-${(randomIndex % 5) + 1}`;
    const userDisplayName = FAKE_NAMES[randomIndex];
    const comment = SAMPLE_COMMENTS[randomIndex % SAMPLE_COMMENTS.length];
    const tags = SAMPLE_TAGS[randomIndex % SAMPLE_TAGS.length];

    const overallRating = Math.floor(Math.random() * 2) + 4; // 4-5 stars
    const coffeeRating = Math.floor(Math.random() * 2) + 4;
    const serviceRating = Math.floor(Math.random() * 3) + 3; // 3-5 stars
    const interiorRating = Math.floor(Math.random() * 3) + 3;

    // Create date in the past (0-60 days ago)
    const daysAgo = Math.floor(Math.random() * 60);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);

    reviews.push({
      id: `mock-review-${shopId}-${i}`,
      shopId,
      shopName,
      userId,
      userDisplayName,
      overallRating,
      ratings: {
        coffee: coffeeRating,
        service: serviceRating,
        interior: interiorRating,
      },
      tags,
      comment,
      createdAt,
      likes: Math.floor(Math.random() * 10),
      likedBy: [],
    });
  }

  return reviews;
}

/**
 * Generate mock user photos for a shop
 */
function generateMockPhotos(shopId: string, shopDocumentId: string, count: number = 2): UserImage[] {
  const photos: UserImage[] = [];

  for (let i = 0; i < count; i++) {
    const randomImageUrl = SAMPLE_IMAGE_URLS[Math.floor(Math.random() * SAMPLE_IMAGE_URLS.length)];

    photos.push({
      id: parseInt(`${Date.now()}${i}`),
      documentId: `mock-photo-${shopDocumentId}-${i}`,
      shop: {
        id: parseInt(shopId),
        documentId: shopDocumentId,
      },
      userId: `dev-user-${(i % 3) + 1}`,
      userEmail: `dev${(i % 3) + 1}@example.com`,
      image: {
        id: parseInt(`${Date.now()}${i}`),
        documentId: `mock-image-${i}`,
        url: randomImageUrl,
      },
      approved: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return photos;
}

/**
 * Enable mock reviews for all shops
 */
export function enableMockReviews(): number {
  if (typeof window === 'undefined') return 0;

  const mockData: Record<string, Review[]> = {};
  let totalCreated = 0;

  // We'll generate reviews on-demand when needed
  // Just set a flag to enable mock mode
  localStorage.setItem(MOCK_REVIEWS_KEY, JSON.stringify({ enabled: true, data: mockData }));

  return totalCreated;
}

/**
 * Disable mock reviews
 */
export function disableMockReviews(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(MOCK_REVIEWS_KEY);
}

/**
 * Get mock reviews for a shop (generates on-demand)
 */
export function getMockReviews(shopId: string, shopName: string): Review[] | null {
  if (typeof window === 'undefined') return null;
  if (process.env.NODE_ENV !== 'development') return null;

  try {
    const stored = localStorage.getItem(MOCK_REVIEWS_KEY);
    if (!stored) return null;

    const { enabled, data } = JSON.parse(stored);
    if (!enabled) return null;

    // Generate reviews on-demand if not already created for this shop
    if (!data[shopId]) {
      data[shopId] = generateMockReviews(shopId, shopName);
      localStorage.setItem(MOCK_REVIEWS_KEY, JSON.stringify({ enabled: true, data }));
    }

    return data[shopId];
  } catch (error) {
    console.error('Error reading mock reviews:', error);
    return null;
  }
}

/**
 * Enable mock user photos for all shops
 */
export function enableMockPhotos(): number {
  if (typeof window === 'undefined') return 0;

  const mockData: Record<string, UserImage[]> = {};

  // Just set a flag to enable mock mode
  localStorage.setItem(MOCK_PHOTOS_KEY, JSON.stringify({ enabled: true, data: mockData }));

  return 0;
}

/**
 * Disable mock user photos
 */
export function disableMockPhotos(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(MOCK_PHOTOS_KEY);
}

/**
 * Get mock user photos for a shop (generates on-demand)
 */
export function getMockPhotos(shopId: string, shopDocumentId: string): UserImage[] | null {
  if (typeof window === 'undefined') return null;
  if (process.env.NODE_ENV !== 'development') return null;

  try {
    const stored = localStorage.getItem(MOCK_PHOTOS_KEY);
    if (!stored) return null;

    const { enabled, data } = JSON.parse(stored);
    if (!enabled) return null;

    // Generate photos on-demand if not already created for this shop
    if (!data[shopDocumentId]) {
      data[shopDocumentId] = generateMockPhotos(shopId, shopDocumentId);
      localStorage.setItem(MOCK_PHOTOS_KEY, JSON.stringify({ enabled: true, data }));
    }

    return data[shopDocumentId];
  } catch (error) {
    console.error('Error reading mock photos:', error);
    return null;
  }
}

/**
 * Check if mock reviews are enabled
 */
export function isMockReviewsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  if (process.env.NODE_ENV !== 'development') return false;

  try {
    const stored = localStorage.getItem(MOCK_REVIEWS_KEY);
    if (!stored) return false;
    const { enabled } = JSON.parse(stored);
    return enabled;
  } catch {
    return false;
  }
}

/**
 * Check if mock photos are enabled
 */
export function isMockPhotosEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  if (process.env.NODE_ENV !== 'development') return false;

  try {
    const stored = localStorage.getItem(MOCK_PHOTOS_KEY);
    if (!stored) return false;
    const { enabled } = JSON.parse(stored);
    return enabled;
  } catch {
    return false;
  }
}

/**
 * Generate mock badges for a user
 */
function generateMockBadges(userId: string): UserBadges {
  // Randomly decide which badges to give
  const hasAreaBadge = Math.random() > 0.5;
  const hasCityBadge = Math.random() > 0.6;
  const hasTopContributor = Math.random() > 0.7;
  const hasEarlyAdopter = Math.random() > 0.8;

  const cityAreaNames = ['Shibuya', 'Shinjuku', 'Harajuku', 'Le Marais', 'SoHo'];
  const cityNames = ['Tokyo', 'Paris', 'New York', 'London', 'Seoul'];

  return {
    cityAreaBadges: hasAreaBadge
      ? [
          {
            cityAreaId: 'mock-area-1',
            cityAreaName: cityAreaNames[Math.floor(Math.random() * cityAreaNames.length)],
            locationId: 'mock-location-1',
            locationName: cityNames[Math.floor(Math.random() * cityNames.length)],
            reviewCount: Math.floor(Math.random() * 10) + 5, // 5-15 reviews
            earnedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // 0-30 days ago
          },
        ]
      : [],
    cityBadges: hasCityBadge
      ? [
          {
            locationId: 'mock-location-1',
            locationName: cityNames[Math.floor(Math.random() * cityNames.length)],
            reviewCount: Math.floor(Math.random() * 15) + 7, // 7-22 reviews
            earnedAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000), // 0-60 days ago
          },
        ]
      : [],
    topContributor: {
      earned: hasTopContributor,
      reviewCount: hasTopContributor ? Math.floor(Math.random() * 30) + 20 : 0, // 20-50 reviews
      earnedAt: hasTopContributor
        ? new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000)
        : null,
    },
    earlyAdopter: {
      earned: hasEarlyAdopter,
      signupRank: hasEarlyAdopter ? Math.floor(Math.random() * 500) + 1 : null, // rank 1-500
      earnedAt: hasEarlyAdopter
        ? new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000)
        : null,
    },
    totalReviews: Math.floor(Math.random() * 50) + 10, // 10-60 reviews
    lastRecalculatedAt: new Date(),
  };
}

/**
 * Enable mock badges for all users
 */
export function enableMockBadges(): void {
  if (typeof window === 'undefined') return;

  const mockData: Record<string, UserBadges> = {};
  localStorage.setItem(MOCK_BADGES_KEY, JSON.stringify({ enabled: true, data: mockData }));
}

/**
 * Disable mock badges
 */
export function disableMockBadges(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(MOCK_BADGES_KEY);
}

/**
 * Get mock badges for a user (generates on-demand)
 */
export function getMockBadges(userId: string): UserBadges | null {
  if (typeof window === 'undefined') return null;
  if (process.env.NODE_ENV !== 'development') return null;

  try {
    const stored = localStorage.getItem(MOCK_BADGES_KEY);
    if (!stored) return null;

    const { enabled, data } = JSON.parse(stored);
    if (!enabled) return null;

    // Generate badges on-demand if not already created for this user
    if (!data[userId]) {
      data[userId] = generateMockBadges(userId);
      localStorage.setItem(MOCK_BADGES_KEY, JSON.stringify({ enabled: true, data }));
    }

    return data[userId];
  } catch (error) {
    console.error('Error reading mock badges:', error);
    return null;
  }
}

/**
 * Check if mock badges are enabled
 */
export function isMockBadgesEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  if (process.env.NODE_ENV !== 'development') return false;

  try {
    const stored = localStorage.getItem(MOCK_BADGES_KEY);
    if (!stored) return false;
    const { enabled } = JSON.parse(stored);
    return enabled;
  } catch {
    return false;
  }
}
