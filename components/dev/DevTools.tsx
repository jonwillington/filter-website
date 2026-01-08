'use client';

import { useState } from 'react';
import { Button } from '@heroui/react';
import { Settings, X, MapPin, Navigation, Eye, EyeOff } from 'lucide-react';
import { setFakeGPS, clearFakeGPS } from '@/lib/hooks/useGeolocation';
import {
  enableMockReviews,
  disableMockReviews,
  enableMockPhotos,
  disableMockPhotos,
  enableMockBadges,
  disableMockBadges,
  isMockReviewsEnabled,
  isMockPhotosEnabled,
  isMockBadgesEnabled
} from '@/lib/utils/mockData';
import { Shop } from '@/lib/types';

interface DevToolsProps {
  shops?: Shop[];
  onClose: () => void;
}

// Preset test locations
const PRESET_LOCATIONS = [
  { name: 'Tokyo, Shibuya', lat: 35.6595, lng: 139.7004 },
  { name: 'Paris, Le Marais', lat: 48.8566, lng: 2.3522 },
  { name: 'New York, SoHo', lat: 40.7234, lng: -74.0001 },
  { name: 'London, Shoreditch', lat: 51.5235, lng: -0.0762 },
  { name: 'Melbourne, CBD', lat: -37.8136, lng: 144.9631 },
  { name: 'Seoul, Gangnam', lat: 37.4979, lng: 127.0276 },
];

export function DevTools({ shops = [], onClose }: DevToolsProps) {
  const [status, setStatus] = useState<string>('');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [mockReviewsActive, setMockReviewsActive] = useState(isMockReviewsEnabled());
  const [mockPhotosActive, setMockPhotosActive] = useState(isMockPhotosEnabled());
  const [mockBadgesActive, setMockBadgesActive] = useState(isMockBadgesEnabled());

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const handleToggleMockReviews = () => {
    if (mockReviewsActive) {
      disableMockReviews();
      setMockReviewsActive(false);
      setStatus('✅ Mock reviews disabled. Refresh to see real data.');
    } else {
      enableMockReviews();
      setMockReviewsActive(true);
      setStatus('✅ Mock reviews enabled! Open any shop to see fake reviews.');
    }
  };

  const handleToggleMockPhotos = () => {
    if (mockPhotosActive) {
      disableMockPhotos();
      setMockPhotosActive(false);
      setStatus('✅ Mock photos disabled. Refresh to see real data.');
    } else {
      enableMockPhotos();
      setMockPhotosActive(true);
      setStatus('✅ Mock photos enabled! Open any shop to see fake photos.');
    }
  };

  const handleToggleMockBadges = () => {
    if (mockBadgesActive) {
      disableMockBadges();
      setMockBadgesActive(false);
      setStatus('✅ Mock badges disabled. Refresh to see real data.');
    } else {
      enableMockBadges();
      setMockBadgesActive(true);
      setStatus('✅ Mock badges enabled! Reviews will show random badges.');
    }
  };

  const handleSetFakeLocation = (lat: number, lng: number, name: string) => {
    setFakeGPS(lat, lng);
    setStatus(`📍 GPS set to: ${name}\nLat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}\n\nRefresh the page to see nearby mode update!`);
    setShowLocationPicker(false);
  };

  const handleClearFakeLocation = () => {
    clearFakeGPS();
    setStatus('✅ Cleared fake GPS. Using real location now.');
    setShowLocationPicker(false);
  };

  return (
    <div
      className="fixed bottom-16 left-4 right-4 md:left-auto md:right-4 md:w-[280px] z-50 p-3 rounded-lg shadow-2xl border"
      style={{
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Settings className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
          <h3 className="font-semibold text-xs" style={{ color: 'var(--text)' }}>
            Dev Tools
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-0.5 rounded hover:bg-border-default"
        >
          <X className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
        </button>
      </div>

      {/* Actions */}
      {!showLocationPicker ? (
        <div className="space-y-1.5">
          <Button
            size="sm"
            variant={mockReviewsActive ? 'solid' : 'flat'}
            color={mockReviewsActive ? 'success' : 'default'}
            className="w-full h-8 text-xs"
            startContent={mockReviewsActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            onPress={handleToggleMockReviews}
          >
            {mockReviewsActive ? 'Mock Reviews ON' : 'Mock Reviews OFF'}
          </Button>

          <Button
            size="sm"
            variant={mockPhotosActive ? 'solid' : 'flat'}
            color={mockPhotosActive ? 'success' : 'default'}
            className="w-full h-8 text-xs"
            startContent={mockPhotosActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            onPress={handleToggleMockPhotos}
          >
            {mockPhotosActive ? 'Mock Photos ON' : 'Mock Photos OFF'}
          </Button>

          <Button
            size="sm"
            variant={mockBadgesActive ? 'solid' : 'flat'}
            color={mockBadgesActive ? 'success' : 'default'}
            className="w-full h-8 text-xs"
            startContent={mockBadgesActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            onPress={handleToggleMockBadges}
          >
            {mockBadgesActive ? 'Mock Badges ON' : 'Mock Badges OFF'}
          </Button>

          <Button
            size="sm"
            variant="flat"
            className="w-full h-8 text-xs bg-surface-elevated border border-border-default hover:bg-border-default"
            startContent={<Navigation className="w-3 h-3" />}
            onPress={() => setShowLocationPicker(true)}
          >
            Set Fake GPS
          </Button>
        </div>
      ) : (
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium" style={{ color: 'var(--text)' }}>
            Choose a test location:
          </p>
          <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
            {PRESET_LOCATIONS.map((location) => (
              <button
                key={location.name}
                onClick={() => handleSetFakeLocation(location.lat, location.lng, location.name)}
                className="w-full text-left px-2 py-1.5 rounded text-[10px] hover:bg-border-default transition-colors"
                style={{ color: 'var(--text)' }}
              >
                <div className="flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5" style={{ color: 'var(--accent)' }} />
                  <span className="font-medium">{location.name}</span>
                </div>
                <div className="text-[9px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </div>
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 pt-1.5 border-t" style={{ borderColor: 'var(--border)' }}>
            <Button
              size="sm"
              variant="flat"
              color="danger"
              className="flex-1 h-7 text-xs"
              onPress={handleClearFakeLocation}
            >
              Clear GPS
            </Button>
            <Button
              size="sm"
              variant="flat"
              className="flex-1 h-7 text-xs"
              onPress={() => setShowLocationPicker(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Status */}
      {status && (
        <div className="mt-2 p-1.5 rounded text-[10px]" style={{ backgroundColor: 'var(--background)' }}>
          <p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{status}</p>
        </div>
      )}
    </div>
  );
}
