'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Avatar, Spinner, Chip } from '@heroui/react';
import { useAuth } from '@/lib/context/AuthContext';
import { reviewsService } from '@/lib/services/reviewsService';
import { Review } from '@/lib/types/auth';
import {
  ArrowLeft,
  Settings,
  MessageSquare,
  Calendar,
  MapPin,
  Award,
  Star,
  Coffee,
} from 'lucide-react';
import { format } from 'date-fns';

export default function ProfilePage() {
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);

  const loadReviews = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const userReviews = await reviewsService.getUserReviews(user.uid);
      setReviews(userReviews);
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setIsLoadingReviews(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }

    if (user) {
      loadReviews();
    }
  }, [user, authLoading, router, loadReviews]);

  if (authLoading || !user || !userProfile) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--background)' }}
      >
        <Spinner size="lg" />
      </div>
    );
  }

  const memberSince = userProfile.createdAt
    ? format(userProfile.createdAt, 'MMMM yyyy')
    : 'Unknown';

  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + r.overallRating, 0) / reviews.length).toFixed(1)
      : null;

  const badges = userProfile.badges;
  const totalBadges =
    (badges?.cityAreaBadges?.length || 0) +
    (badges?.cityBadges?.length || 0) +
    (badges?.topContributor?.earned ? 1 : 0) +
    (badges?.earlyAdopter?.earned ? 1 : 0);

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--background)', paddingBottom: '80px' }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 backdrop-blur-md"
        style={{
          backgroundColor: 'rgba(var(--background), 0.95)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              isIconOnly
              variant="light"
              onPress={() => router.back()}
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
              Profile
            </h1>
          </div>
          <Button
            isIconOnly
            variant="light"
            onPress={() => router.push('/settings')}
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Profile Card */}
        <div
          className="p-6 rounded-xl"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-4 mb-6">
            <Avatar
              src={userProfile.photoURL}
              name={userProfile.displayName}
              size="lg"
              isBordered
              color="primary"
              className="w-20 h-20"
            />
            <div className="flex-1">
              <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
                {userProfile.displayName}
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {userProfile.email}
              </p>
              {userProfile.about && (
                <p className="text-sm mt-2" style={{ color: 'var(--text)' }}>
                  {userProfile.about}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>Joined {memberSince}</span>
            </div>
            {userProfile.country && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{userProfile.country.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div
            className="p-4 rounded-xl text-center"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <MessageSquare className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--accent)' }} />
            <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
              {isLoadingReviews ? '-' : reviews.length}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Reviews
            </p>
          </div>

          <div
            className="p-4 rounded-xl text-center"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <Star className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--accent)' }} />
            <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
              {averageRating || '-'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Avg Rating
            </p>
          </div>

          <div
            className="p-4 rounded-xl text-center"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <Award className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--accent)' }} />
            <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
              {totalBadges}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Badges
            </p>
          </div>
        </div>

        {/* Badges Section */}
        {totalBadges > 0 && (
          <div
            className="p-6 rounded-xl"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
              Badges
            </h3>
            <div className="flex flex-wrap gap-2">
              {badges?.earlyAdopter?.earned && (
                <Chip color="warning" variant="flat" startContent={<Star className="w-3 h-3" />}>
                  Early Adopter
                </Chip>
              )}
              {badges?.topContributor?.earned && (
                <Chip color="success" variant="flat" startContent={<Award className="w-3 h-3" />}>
                  Top Contributor
                </Chip>
              )}
              {badges?.cityBadges?.map((badge) => (
                <Chip
                  key={badge.locationId}
                  color="primary"
                  variant="flat"
                  startContent={<MapPin className="w-3 h-3" />}
                >
                  {badge.locationName} Explorer
                </Chip>
              ))}
              {badges?.cityAreaBadges?.map((badge) => (
                <Chip
                  key={badge.cityAreaId}
                  color="secondary"
                  variant="flat"
                  startContent={<Coffee className="w-3 h-3" />}
                >
                  {badge.cityAreaName} Regular
                </Chip>
              ))}
            </div>
          </div>
        )}

        {/* Preferences Summary */}
        {userProfile.preferences && (
          <div
            className="p-6 rounded-xl"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
                Coffee Preferences
              </h3>
              <Button
                size="sm"
                variant="light"
                onPress={() => router.push('/settings')}
              >
                Edit
              </Button>
            </div>

            {userProfile.preferences.preferredBrewMethods &&
              userProfile.preferences.preferredBrewMethods.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Brew Methods
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {userProfile.preferences.preferredBrewMethods.map((method) => (
                      <Chip key={method} size="sm" variant="bordered">
                        {method.replace(/_/g, ' ')}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}

            {userProfile.preferences.preferredTags &&
              userProfile.preferences.preferredTags.length > 0 && (
                <div>
                  <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Preferred Vibes
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {userProfile.preferences.preferredTags.map((tag) => (
                      <Chip key={tag} size="sm" variant="bordered">
                        {tag.replace(/_/g, ' ')}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}

            {(!userProfile.preferences.preferredBrewMethods ||
              userProfile.preferences.preferredBrewMethods.length === 0) &&
              (!userProfile.preferences.preferredTags ||
                userProfile.preferences.preferredTags.length === 0) && (
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  No preferences set yet. Customize your experience in settings.
                </p>
              )}
          </div>
        )}

        {/* Quick Links */}
        <div className="space-y-2">
          <Button
            variant="flat"
            className="w-full justify-start"
            startContent={<MessageSquare className="w-4 h-4" />}
            onPress={() => router.push('/reviews')}
          >
            View My Reviews
          </Button>
          <Button
            variant="flat"
            className="w-full justify-start"
            startContent={<Settings className="w-4 h-4" />}
            onPress={() => router.push('/settings')}
          >
            Account Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
