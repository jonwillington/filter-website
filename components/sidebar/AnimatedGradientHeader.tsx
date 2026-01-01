'use client';

import { useEffect, useRef, ReactNode } from 'react';

interface AnimatedGradientHeaderProps {
  children: ReactNode;
  className?: string;
}

export function AnimatedGradientHeader({ children, className = '' }: AnimatedGradientHeaderProps) {
  const gradientRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const animate = () => {
      if (!gradientRef.current) return;

      const elapsed = Date.now() - startTimeRef.current;
      const duration = 4000; // 4 seconds for one direction
      const totalDuration = duration * 2; // 8 seconds total (forward + back)

      // Calculate progress (0 to 1 and back to 0)
      const progress = (elapsed % totalDuration) / duration;
      const normalizedProgress = progress > 1 ? 2 - progress : progress;

      // Interpolate start and end points
      const startX = 0 + normalizedProgress * 0.5; // 0 -> 0.5 -> 0
      const startY = 0 + normalizedProgress * 0.4; // 0 -> 0.4 -> 0
      const endX = 1 - normalizedProgress * 0.4; // 1 -> 0.6 -> 1
      const endY = 1 + normalizedProgress * 0.3; // 1 -> 1.3 -> 1

      gradientRef.current.style.background = `linear-gradient(
        ${Math.atan2(endY - startY, endX - startX)}rad,
        #2E1F1788,
        #2E1F17bb,
        #2E1F17dd,
        #2E1F17f5
      )`;

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={gradientRef}
      className={`animated-gradient-header ${className}`}
      style={{
        background: 'linear-gradient(135deg, #2E1F1788, #2E1F17bb, #2E1F17dd, #2E1F17f5)',
      }}
    >
      {children}
    </div>
  );
}
