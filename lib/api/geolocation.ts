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

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<{ country: string; countryCode: string } | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=3&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'FilterWebsite/1.0',
        },
      }
    );
    const data = await response.json();

    if (data.address?.country && data.address?.country_code) {
      return {
        country: data.address.country,
        countryCode: data.address.country_code.toUpperCase(),
      };
    }
    return null;
  } catch (error) {
    console.error('Failed to reverse geocode:', error);
    return null;
  }
}
