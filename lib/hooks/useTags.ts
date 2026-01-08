'use client';

import { useState, useEffect } from 'react';
import { Tag, getAllTags } from '@/lib/api/tags';

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchTags() {
      try {
        const data = await getAllTags();
        if (!cancelled) {
          setTags(data);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch tags'));
          setIsLoading(false);
        }
      }
    }

    fetchTags();

    return () => {
      cancelled = true;
    };
  }, []);

  return { tags, isLoading, error };
}
