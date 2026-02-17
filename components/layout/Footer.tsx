'use client';

import { useState } from 'react';
import { Mail, Instagram, Settings } from 'lucide-react';
import { LegalModal } from '../modals/LegalModal';
import { DevTools } from '../dev/DevTools';
import { Shop } from '@/lib/types';

interface FooterProps {
  shops?: Shop[];
  isFirstTimeVisitor?: boolean;
  onToggleFirstTimeVisitor?: () => void;
}

export function Footer({ shops = [], isFirstTimeVisitor, onToggleFirstTimeVisitor }: FooterProps) {
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null);
  const [showDevTools, setShowDevTools] = useState(false);
  return (
    <>
      <footer className="footer">
        <div className="flex items-center gap-4 text-sm text-textSecondary">
          <button
            onClick={() => setLegalModal('privacy')}
            className="hover:text-accent transition-colors cursor-pointer"
          >
            Privacy
          </button>
          <span className="text-border">•</span>
          <button
            onClick={() => setLegalModal('terms')}
            className="hover:text-accent transition-colors cursor-pointer"
          >
            Terms
          </button>
          <span className="text-border">•</span>
          <a
            href="mailto:hey@filter.coffee"
            className="hover:text-accent transition-colors p-1"
            aria-label="Email us"
          >
            <Mail className="w-4 h-4" />
          </a>
          <a
            href="https://www.instagram.com/filter.coffee.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent transition-colors p-1"
            aria-label="Follow us on Instagram"
          >
            <Instagram className="w-4 h-4" />
          </a>
          <span className="text-border">•</span>
          <span>© {new Date().getFullYear()} Filter</span>
          {process.env.NODE_ENV === 'development' && (
            <>
              <span className="text-border">•</span>
              <button
                onClick={() => setShowDevTools(!showDevTools)}
                className="hover:text-accent transition-colors cursor-pointer p-1"
                aria-label="Dev Tools"
                title="Dev Tools"
              >
                <Settings className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        <a
          href="https://apps.apple.com/gb/app/filter/id6755623408?itscg=30200&itsct=apps_box_badge&mttnsubad=6755623408"
          style={{ display: 'inline-block' }}
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src="https://toolbox.marketingtools.apple.com/api/v2/badges/download-on-the-app-store/black/en-us?releaseDate=1764115200"
            alt="Download on the App Store"
            style={{ width: '105px', height: '35px', verticalAlign: 'middle', objectFit: 'contain' }}
          />
        </a>
      </footer>

      {/* Dev Tools - positioned above footer */}
      {process.env.NODE_ENV === 'development' && showDevTools && (
        <DevTools
          shops={shops}
          onClose={() => setShowDevTools(false)}
          isFirstTimeVisitor={isFirstTimeVisitor}
          onToggleFirstTimeVisitor={onToggleFirstTimeVisitor}
        />
      )}

      <LegalModal
        isOpen={legalModal !== null}
        onClose={() => setLegalModal(null)}
        type={legalModal || 'privacy'}
      />
    </>
  );
}
