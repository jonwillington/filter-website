'use client';

import { ReactNode, forwardRef, useState, useEffect, useRef } from 'react';

interface UnifiedDrawerProps {
  children: ReactNode;
  className?: string;
  contentType?: 'shop' | 'location';
  isVisible?: boolean;
}

export const UnifiedDrawer = forwardRef<HTMLDivElement, UnifiedDrawerProps>(
  function UnifiedDrawer({ children, className = 'shop-drawer', contentType, isVisible = true }, ref) {
    const [frozenContent, setFrozenContent] = useState<ReactNode | null>(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isEntering, setIsEntering] = useState(true);
    const [isExiting, setIsExiting] = useState(false);
    const previousContentTypeRef = useRef(contentType);
    const currentChildrenRef = useRef(children);
    const oldChildrenRef = useRef(children);

    // Remove entering class after animation completes
    useEffect(() => {
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

    useEffect(() => {
      // Only transition when switching between different content types
      if (contentType && previousContentTypeRef.current && contentType !== previousContentTypeRef.current) {
        // Freeze the OLD content and start fade out
        setFrozenContent(oldChildrenRef.current);
        setIsTransitioning(true);

        // Wait for fade out, then clear frozen content and fade in new content
        const timeout = setTimeout(() => {
          setFrozenContent(null);
          oldChildrenRef.current = currentChildrenRef.current;
          previousContentTypeRef.current = contentType;
          setIsTransitioning(false);
        }, 150);

        return () => clearTimeout(timeout);
      } else {
        // Initial render or same content type - update old children
        previousContentTypeRef.current = contentType;
        oldChildrenRef.current = currentChildrenRef.current;
      }
    }, [contentType]); // Only depend on contentType

    // Update current children ref
    currentChildrenRef.current = children;

    const classNames = [
      className,
      isEntering ? 'entering' : '',
      isExiting ? 'exiting' : '',
    ].filter(Boolean).join(' ');

    return (
      <div ref={ref} className={classNames}>
        <div
          className="transition-opacity duration-150"
          style={{ opacity: isTransitioning ? 0 : 1 }}
        >
          {isTransitioning && frozenContent ? frozenContent : children}
        </div>
      </div>
    );
  }
);
