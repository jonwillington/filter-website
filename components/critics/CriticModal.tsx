'use client';

import { useRef, useEffect } from 'react';
import Image from 'next/image';
import { ModalBody, Divider } from '@heroui/react';
import { Critic, Shop } from '@/lib/types';
import { ResponsiveModal } from '@/components/ui/ResponsiveModal';
import { StickyDrawerHeader } from '@/components/ui';
import { getMediaUrl } from '@/lib/utils';
import { useStickyHeaderOpacity } from '@/lib/hooks';
import { CriticPickCard } from './CriticPickCard';
import { ExternalLink } from 'lucide-react';

interface CriticModalProps {
  critic: Critic | null;
  isOpen: boolean;
  onClose: () => void;
  onShopSelect?: (shop: Shop) => void;
}

export function CriticModal({ critic, isOpen, onClose, onShopSelect }: CriticModalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { opacity: stickyHeaderOpacity, resetOpacity } = useStickyHeaderOpacity(scrollRef);

  // Reset scroll position when critic changes
  useEffect(() => {
    if (critic) {
      resetOpacity();
    }
  }, [critic?.documentId, resetOpacity]);

  if (!critic) return null;

  const photoUrl = getMediaUrl(critic.photo);
  const picks = critic.critic_picks ?? [];

  const handlePickClick = (shop: Shop | undefined) => {
    if (shop && onShopSelect) {
      onClose();
      onShopSelect(shop);
    }
  };

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      modalClassNames={{
        base: 'bg-background',
      }}
    >
      <ModalBody className="p-0 overflow-hidden flex flex-col">
        {/* Scrollable content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {/* Sticky header that fades in on scroll */}
          <StickyDrawerHeader
            title={critic.name}
            opacity={stickyHeaderOpacity}
            onClose={onClose}
          />

          {/* Content */}
          <div className="p-6 space-y-5">
            {/* Header with photo and name */}
            <div className="flex items-start gap-4">
              {/* Photo */}
              {photoUrl ? (
                <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-white/10">
                  <Image
                    src={photoUrl}
                    alt={critic.name}
                    width={80}
                    height={80}
                    className="object-cover w-full h-full"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-medium bg-gray-200 text-gray-600 dark:bg-white/20 dark:text-white flex-shrink-0">
                  {critic.name.charAt(0)}
                </div>
              )}

              <div className="flex-1 min-w-0">
                {/* Name */}
                <h2
                  className="text-primary"
                  style={{
                    fontFamily: 'PPNeueYork, serif',
                    fontSize: '28px',
                    fontWeight: 600,
                    letterSpacing: '-0.5px',
                    lineHeight: 1.15,
                  }}
                >
                  {critic.name}
                </h2>

                {/* Social links */}
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {critic.website && (
                    <a
                      href={critic.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary transition-colors"
                    >
                      <ExternalLink size={14} />
                      Website
                    </a>
                  )}
                  {critic.instagram && (
                    <a
                      href={`https://instagram.com/${critic.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                      </svg>
                      Instagram
                    </a>
                  )}
                  {critic.twitter && (
                    <a
                      href={`https://twitter.com/${critic.twitter.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                      Twitter
                    </a>
                  )}
                  {critic.youtube && (
                    <a
                      href={critic.youtube.startsWith('http') ? critic.youtube : `https://youtube.com/${critic.youtube}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                      </svg>
                      YouTube
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Bio */}
            {critic.bio && (
              <>
                <Divider className="bg-border-default" />
                <div>
                  <h3 className="text-sm font-medium text-primary mb-2">About</h3>
                  <p className="text-sm text-primary whitespace-pre-wrap leading-relaxed">
                    {critic.bio}
                  </p>
                </div>
              </>
            )}

            {/* Picks */}
            {picks.length > 0 && (
              <>
                <Divider className="bg-border-default" />
                <div>
                  <h3 className="text-sm font-medium text-primary mb-3">
                    Their Picks
                  </h3>
                  <div className="divide-y divide-border-default -mx-5">
                    {picks.map((pick) => (
                      <CriticPickCard
                        key={pick.documentId}
                        pick={pick}
                        onClick={() => handlePickClick(pick.shop)}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </ModalBody>
    </ResponsiveModal>
  );
}
