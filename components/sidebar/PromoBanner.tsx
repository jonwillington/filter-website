'use client';

import { Sparkles } from 'lucide-react';

interface PromoBannerProps {
  text?: string;
}

export function PromoBanner({
  text = "20,000+ shops being added in 2026",
}: PromoBannerProps) {
  return (
    <div className="absolute -top-7 left-0 right-0 z-[1001] flex justify-center pointer-events-none">
      <div className="relative pointer-events-auto">
        {/* Main banner */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-5 py-2 rounded-t-2xl shadow-lg">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-bold whitespace-nowrap">{text}</span>
          </div>
        </div>

        {/* Left fold - creates the wrap effect */}
        <div
          className="absolute -bottom-2 -left-2 w-4 h-4"
          style={{
            background: 'linear-gradient(135deg, #d97706 50%, transparent 50%)',
          }}
        />

        {/* Right fold - creates the wrap effect */}
        <div
          className="absolute -bottom-2 -right-2 w-4 h-4"
          style={{
            background: 'linear-gradient(225deg, #d97706 50%, transparent 50%)',
          }}
        />

        {/* Shadow underneath to show depth */}
        <div
          className="absolute top-full left-2 right-2 h-2 bg-gradient-to-b from-black/20 to-transparent"
        />
      </div>
    </div>
  );
}
