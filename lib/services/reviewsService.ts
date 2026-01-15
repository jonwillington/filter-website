import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore/lite';
import { db } from '../config/firebase';
import { Review } from '../types/auth';
import { getMockReviews } from '../utils/mockData';

class ReviewsService {
  private readonly COLLECTION = 'shopQuickReviews';

  async createReview(
    shopId: string,
    shopName: string,
    userId: string,
    userDisplayName: string,
    overallRating: number,
    ratings: { coffee: number; service: number; interior: number },
    tags: string[],
    comment: string | null,
    locationData?: {
      cityAreaId?: string;
      cityAreaName?: string;
      locationId?: string;
      locationName?: string;
    }
  ): Promise<string> {
    try {
      if (!db) throw new Error('Firestore not initialized');

      const reviewsRef = collection(db, this.COLLECTION);
      const newReviewRef = doc(reviewsRef);

      const reviewData = {
        id: newReviewRef.id,
        shopId,
        shopName,
        userId,
        userDisplayName,
        overallRating,
        ratings,
        tags,
        comment,
        createdAt: serverTimestamp(),
        visibility: 'public',
        likes: 0,
        likedBy: [],
        cityAreaId: locationData?.cityAreaId || null,
        cityAreaName: locationData?.cityAreaName || null,
        locationId: locationData?.locationId || null,
        locationName: locationData?.locationName || null,
      };

      await setDoc(newReviewRef, reviewData);
      return newReviewRef.id;
    } catch (error) {
      console.error('Error creating review:', error);
      throw new Error('Failed to create review');
    }
  }

  async updateReview(
    reviewId: string,
    overallRating: number,
    ratings: { coffee: number; service: number; interior: number },
    tags: string[],
    comment: string | null
  ): Promise<void> {
    try {
      if (!db) throw new Error('Firestore not initialized');

      const reviewRef = doc(db, this.COLLECTION, reviewId);

      await updateDoc(reviewRef, {
        overallRating,
        ratings,
        tags,
        comment,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating review:', error);
      throw new Error('Failed to update review');
    }
  }

  async deleteReview(reviewId: string): Promise<void> {
    try {
      if (!db) throw new Error('Firestore not initialized');

      const reviewRef = doc(db, this.COLLECTION, reviewId);
      await deleteDoc(reviewRef);
    } catch (error) {
      console.error('Error deleting review:', error);
      throw new Error('Failed to delete review');
    }
  }

  async getShopReviews(shopId: string, shopName?: string): Promise<Review[]> {
    // Check for mock data first (dev only)
    const mockReviews = getMockReviews(shopId, shopName || 'Shop');
    if (mockReviews) {
      console.log('[ReviewsService] Using mock reviews for', shopId);
      return mockReviews;
    }

    try {
      if (!db) throw new Error('Firestore not initialized');

      const reviewsRef = collection(db, this.COLLECTION);
      const q = query(
        reviewsRef,
        where('shopId', '==', shopId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);

      // Filter to only show public reviews (or reviews without visibility field for backwards compat)
      return snapshot.docs
        .filter((doc) => {
          const visibility = doc.data().visibility;
          return visibility === 'public' || visibility === undefined;
        })
        .map((doc) => this.mapReviewData(doc.data()));
    } catch (error) {
      console.error('Error getting shop reviews:', error);
      throw new Error('Failed to get shop reviews');
    }
  }

  async getUserReviews(userId: string): Promise<Review[]> {
    try {
      if (!db) throw new Error('Firestore not initialized');

      const reviewsRef = collection(db, this.COLLECTION);
      const q = query(
        reviewsRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);

      return snapshot.docs.map((doc) => this.mapReviewData(doc.data()));
    } catch (error) {
      console.error('Error getting user reviews:', error);
      throw new Error('Failed to get user reviews');
    }
  }

  private mapReviewData(data: any): Review {
    return {
      id: data.id,
      shopId: data.shopId,
      shopName: data.shopName,
      userId: data.userId,
      userDisplayName: data.userDisplayName,
      overallRating: data.overallRating,
      ratings: data.ratings,
      tags: data.tags || [],
      comment: data.comment,
      createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(),
      updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate() : undefined,
      likes: data.likes || 0,
      likedBy: data.likedBy || [],
      cityAreaId: data.cityAreaId || null,
      cityAreaName: data.cityAreaName || null,
      locationId: data.locationId || null,
      locationName: data.locationName || null,
    };
  }
}

export const reviewsService = new ReviewsService();
