'use client';

import { useState } from 'react';
import { Sun, Moon, Mail, Instagram } from 'lucide-react';
import { LegalModal } from '../modals/LegalModal';
import { useTheme } from '@/lib/context/ThemeContext';

export function Footer() {
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null);
  const { effectiveTheme, setThemeMode } = useTheme();

  const toggleTheme = () => {
    setThemeMode(effectiveTheme === 'dark' ? 'light' : 'dark');
  };

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
          <span className="text-border">•</span>
          <button
            onClick={toggleTheme}
            className="hover:text-accent transition-colors cursor-pointer p-1"
            aria-label={effectiveTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {effectiveTheme === 'dark' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
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
