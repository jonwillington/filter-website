'use client';

import Image from 'next/image';
import { ModalBody } from '@heroui/react';
import { ResponsiveModal } from '@/components/ui/ResponsiveModal';

interface FilterRecommendationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Criterion {
  headline: string;
  description: string;
}

const CRITERIA: Criterion[] = [
  {
    headline: 'Excellent coffee',
    description: 'Shops committed to producing exceptional quality coffee',
  },
  {
    headline: 'Intentional design',
    description: 'Well thought out, intentional interiors that enhance the experience',
  },
  {
    headline: 'Welcoming service',
    description: 'Friendly, warm service that makes you feel at home',
  },
];

export function FilterRecommendationsModal({ isOpen, onClose }: FilterRecommendationsModalProps) {
  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      modalClassNames={{
        base: 'bg-background',
      }}
    >
      <ModalBody className="p-6">
        <h2
          className="text-primary mb-2"
          style={{
            fontFamily: 'PPNeueYork, serif',
            fontSize: '28px',
            fontWeight: 600,
            letterSpacing: '-0.5px',
            lineHeight: 1.15,
          }}
        >
          What makes a Filter recommendation?
        </h2>

        <p className="text-text-secondary text-sm mb-6">
          Only the best shops in each city can make it into our Filter recommendations.
        </p>

        <div className="space-y-3">
          {CRITERIA.map((criterion, index) => (
            <div
              key={index}
              className="bg-surface rounded-xl p-4 flex items-start gap-4"
            >
              <Image
                src="/checkmark.png"
                alt=""
                width={40}
                height={40}
                className="flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-primary font-semibold text-base">
                  {criterion.headline}
                </h3>
                <p className="text-text-secondary text-sm mt-0.5">
                  {criterion.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ModalBody>
    </ResponsiveModal>
  );
}
