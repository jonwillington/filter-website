'use client';

import { useState, useEffect } from 'react';

const coffeeMessages = [
  'Grinding beans...',
  'Tamping...',
  'Pulling shot...',
  'Steaming milk...',
];

export default function Loading() {
  const [messageIndex, setMessageIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  // Cycle through coffee messages
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % coffeeMessages.length);
    }, 1200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`fixed inset-0 bg-background transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Sidebar skeleton */}
      <div className="hidden lg:flex w-80 h-full bg-surface border-r border-border-default flex-col">
        {/* Header skeleton */}
        <div className="p-4 border-b border-border-default">
          <div className="h-8 w-32 bg-border-default rounded animate-pulse" />
        </div>

        {/* Search bar skeleton */}
        <div className="p-4">
          <div className="h-10 bg-border-default rounded-lg animate-pulse" />
        </div>

        {/* List items skeleton */}
        <div className="flex-1 overflow-hidden p-4 space-y-3">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="flex gap-3 p-3 rounded-lg bg-border-default/50"
              style={{
                animationDelay: `${i * 100}ms`,
                opacity: 0,
                animation: 'fadeIn 0.3s ease-out forwards',
              }}
            >
              <div className="w-12 h-12 rounded-lg bg-border-default animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-border-default rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-border-default rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Map skeleton */}
      <div className="absolute inset-0 lg:left-80 bg-surface">
        <div className="w-full h-full bg-gradient-to-br from-surface to-border-default" />

        {/* Loading spinner overlay with coffee messages */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            {/* Coffee cup spinner */}
            <div className="relative">
              <div className="w-12 h-12 border-3 border-accent/30 rounded-full" />
              <div className="absolute inset-0 w-12 h-12 border-3 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
            {/* Rotating coffee message */}
            <span
              key={messageIndex}
              className="text-sm text-text-secondary animate-fade-in"
            >
              {coffeeMessages[messageIndex]}
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
