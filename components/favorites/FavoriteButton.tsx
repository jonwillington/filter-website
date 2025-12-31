'use client';

import { Button } from '@heroui/react';
import { Heart } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { favoritesService } from '@/lib/services/favoritesService';
import { useState, useEffect } from 'react';

interface FavoriteButtonProps {
  shopId: string;
  shopName: string;
  onLoginRequired?: () => void;
  variant?: 'solid' | 'bordered' | 'light' | 'flat';
  size?: 'sm' | 'md' | 'lg';
}

export function FavoriteButton({
  shopId,
  shopName,
  onLoginRequired,
  variant = 'light',
  size = 'md',
}: FavoriteButtonProps) {
  const { user } = useAuth();
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      checkFavoriteStatus();
    } else {
      setIsFavorited(false);
    }
  }, [user, shopId]);

  const checkFavoriteStatus = async () => {
    if (!user) return;
    try {
      const status = await favoritesService.isFavorited(user.uid, shopId);
      setIsFavorited(status);
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const handleToggleFavorite = async () => {
    if (!user) {
      onLoginRequired?.();
      return;
    }

    setLoading(true);
    try {
      if (isFavorited) {
        await favoritesService.removeFavorite(user.uid, shopId);
        setIsFavorited(false);
      } else {
        await favoritesService.addFavorite(user.uid, shopId, shopName);
        setIsFavorited(true);
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      isIconOnly
      variant={variant}
      size={size}
      onPress={handleToggleFavorite}
      isLoading={loading}
      color={isFavorited ? 'danger' : 'default'}
    >
      <Heart
        className={size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'}
        fill={isFavorited ? 'currentColor' : 'none'}
      />
    </Button>
  );
}
