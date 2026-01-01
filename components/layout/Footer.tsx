'use client';

import { useState } from 'react';
import { LegalModal } from '../modals/LegalModal';

export function Footer() {
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null);

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
          <span>© {new Date().getFullYear()} Filter</span>
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

      <LegalModal
        isOpen={legalModal !== null}
        onClose={() => setLegalModal(null)}
        type={legalModal || 'privacy'}
      />
    </>
  );
}
