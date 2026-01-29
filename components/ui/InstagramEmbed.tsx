'use client';

import Script from 'next/script';
import { useEffect, useRef } from 'react';

interface InstagramEmbedProps {
  /** Raw HTML from Instagram embed code (blockquote only, no script tag). */
  embedHtml: string | null | undefined;
}

declare global {
  interface Window {
    instgrm?: { Embeds?: { process?: () => void } };
  }
}

/**
 * Renders an Instagram post embed. Pass the blockquote HTML from Instagram's
 * embed code; the script is loaded automatically. When you add a CMS field
 * (e.g. shop.instagram_embed_html), pass that here.
 */
export function InstagramEmbed({ embedHtml }: InstagramEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!embedHtml || !containerRef.current) return;
    const instgrm = window.instgrm;
    if (instgrm?.Embeds?.process) {
      instgrm.Embeds.process();
    }
  }, [embedHtml]);

  if (!embedHtml?.trim()) return null;

  return (
    <>
      <div
        ref={containerRef}
        className="instagram-embed-wrapper my-4 flex justify-center [&_.instagram-media]:max-w-full [&_.instagram-media]:min-w-0"
        dangerouslySetInnerHTML={{ __html: embedHtml.trim() }}
      />
      <Script
        src="https://www.instagram.com/embed.js"
        strategy="lazyOnload"
        onLoad={() => {
          window.instgrm?.Embeds?.process?.();
        }}
      />
    </>
  );
}
