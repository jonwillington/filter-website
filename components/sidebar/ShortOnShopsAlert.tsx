'use client';

import Image from 'next/image';

interface ShortOnShopsAlertProps {
  locationName: string;
}

export function ShortOnShopsAlert({ locationName }: ShortOnShopsAlertProps) {
  return (
    <div className="mx-4 mt-4 mb-4 p-5 bg-surface border border-border-default rounded-xl text-center">
      <div className="flex justify-center mb-4">
        <Image
          src="/empty_beans.png"
          alt="Coffee beans illustration"
          width={120}
          height={80}
          className="opacity-90"
        />
      </div>

      <h3 className="font-display text-xl text-primary mb-2">
        We're short on shops
      </h3>

      <p className="text-sm text-text-secondary leading-relaxed mb-3">
        We've visited <span className="font-medium text-primary">{locationName}</span> but
        haven't found many specialty coffee spots worth featuring yet.
      </p>

      <p className="text-xs text-text-secondary">
        Know a hidden gem?{' '}
        <a
          href="mailto:hello@filter.coffee"
          className="text-accent hover:underline font-medium"
        >
          Let us know
        </a>
      </p>
    </div>
  );
}
