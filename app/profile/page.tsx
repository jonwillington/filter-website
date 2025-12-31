'use client';

import { useAuth } from '@/lib/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Card, CardBody, CardHeader, Avatar, Button, Spinner } from '@heroui/react';
import { Calendar, Mail, Globe, LogOut } from 'lucide-react';

export default function ProfilePage() {
  const { user, userProfile, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user || !userProfile) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6">
          <CardHeader className="flex flex-col gap-4 items-center pt-8">
            <Avatar
              src={userProfile.photoURL}
              name={userProfile.displayName}
              className="w-24 h-24"
              isBordered
              color="primary"
            />
            <div className="text-center">
              <h1 className="text-2xl font-bold">{userProfile.displayName}</h1>
              <p className="text-default-500 text-sm mt-1">Filter Coffee Explorer</p>
            </div>
          </CardHeader>
          <CardBody className="pt-0">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-default-700">
                <Mail className="w-5 h-5 text-default-400" />
                <span>{userProfile.email}</span>
              </div>

              {userProfile.timezone && (
                <div className="flex items-center gap-3 text-default-700">
                  <Globe className="w-5 h-5 text-default-400" />
                  <span>{userProfile.timezone}</span>
                </div>
              )}

              {userProfile.createdAt && (
                <div className="flex items-center gap-3 text-default-700">
                  <Calendar className="w-5 h-5 text-default-400" />
                  <span>
                    Member since {new Date(userProfile.createdAt).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              )}
            </div>

            {userProfile.about && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-default-600 mb-2">About</h3>
                <p className="text-default-700">{userProfile.about}</p>
              </div>
            )}

            <div className="mt-8 flex gap-3">
              <Button
                color="danger"
                variant="flat"
                startContent={<LogOut className="w-4 h-4" />}
                onPress={handleSignOut}
              >
                Sign Out
              </Button>
            </div>
          </CardBody>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Favorites</h2>
            </CardHeader>
            <CardBody>
              <p className="text-default-500 text-sm">
                Your favorite coffee shops will appear here.
              </p>
              <Button
                className="mt-4"
                variant="flat"
                onPress={() => router.push('/')}
              >
                Explore Shops
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Reviews</h2>
            </CardHeader>
            <CardBody>
              <p className="text-default-500 text-sm">
                Your reviews will appear here.
              </p>
              <Button
                className="mt-4"
                variant="flat"
                onPress={() => router.push('/')}
              >
                Write a Review
              </Button>
            </CardBody>
          </Card>
        </div>

        {userProfile.preferences && (
          <Card className="mt-6">
            <CardHeader>
              <h2 className="text-lg font-semibold">Preferences</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-default-600">Theme: </span>
                  <span className="text-sm text-default-700 capitalize">
                    {userProfile.preferences.themeMode}
                  </span>
                </div>
                {userProfile.preferences.preferredBrewMethods && userProfile.preferences.preferredBrewMethods.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-default-600">Preferred Brew Methods: </span>
                    <span className="text-sm text-default-700">
                      {userProfile.preferences.preferredBrewMethods.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
