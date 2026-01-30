'use client';

import { ReactNode, forwardRef, useState, useEffect, useRef } from 'react';

// Track if drawer has been shown in this session to avoid re-animating on route changes
let hasDrawerBeenShown = false;

interface UnifiedDrawerProps {
  children: ReactNode;
  className?: string;
  contentType?: 'shop' | 'location';
  isVisible?: boolean;
}

export const UnifiedDrawer = forwardRef<HTMLDivElement, UnifiedDrawerProps>(
  function UnifiedDrawer({ children, className = 'shop-drawer', contentType, isVisible = true }, ref) {
    // Only animate entering if drawer hasn't been shown yet in this session
    const [isEntering, setIsEntering] = useState(!hasDrawerBeenShown);
    const [isExiting, setIsExiting] = useState(false);
    const [displayedChildren, setDisplayedChildren] = useState(children);
    const scrollRef = useRef<HTMLDivElement>(null);
    const previousContentTypeRef = useRef(contentType);

    // Mark drawer as shown and remove entering class after animation
    useEffect(() => {
      hasDrawerBeenShown = true;
      if (isEntering) {
        const timeout = setTimeout(() => setIsEntering(false), 300);
        return () => clearTimeout(timeout);
      }
    }, [isEntering]);

    // Handle exit animation
    useEffect(() => {
      if (!isVisible && !isExiting) {
        setIsExiting(true);
      } else if (isVisible && isExiting) {
        setIsExiting(false);
      }
    }, [isVisible, isExiting]);

    // Handle content type transition (location <-> shop)
    // No fade animation - just update content immediately and scroll to top
    // The content is different enough that fading just causes a visual flash
    useEffect(() => {
      if (contentType !== previousContentTypeRef.current) {
        // Update content immediately
        setDisplayedChildren(children);
        scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
        previousContentTypeRef.current = contentType;
      } else {
        // Same content type - update children immediately
        setDisplayedChildren(children);
      }
    }, [contentType, children]);

    const classNames = [
      className,
      isEntering ? 'entering' : '',
      isExiting ? 'exiting' : '',
    ].filter(Boolean).join(' ');

    return (
      <div ref={(node) => {
        // Merge refs
        (scrollRef as any).current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }} className={classNames}>
        <div className="flex-1 flex flex-col">
          {displayedChildren}
        </div>
      </div>
    );
  }
);
