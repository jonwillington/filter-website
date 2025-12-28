import { apiClient } from './client';
import { NearbyShopsResponse, GeoLocationResponse } from '../types';

export async function getNearbyShops(
  lat: number,
  lng: number,
  radius: number = 2000,
  limit: number = 50
): Promise<NearbyShopsResponse> {
  try {
    return await apiClient<NearbyShopsResponse>(
      `/geo-location/nearby-shops?lat=${lat}&lng=${lng}&radius=${radius}&limit=${limit}`,
      { revalidate: 30 }
    );
  } catch (error) {
    console.error('Failed to fetch nearby shops:', error);
    return { shops: [] };
  }
}

export async function detectUserArea(
  lat: number,
  lng: number
): Promise<GeoLocationResponse | null> {
  try {
    return await apiClient<GeoLocationResponse>(
      `/geo-location/area?lat=${lat}&lng=${lng}`,
      { revalidate: 60 }
    );
  } catch (error) {
    console.error('Failed to detect user area:', error);
    return null;
  }
}
