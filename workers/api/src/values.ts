import type { Image, ImageVariant, SocialLinks } from '../../../types/api-v3';

/* eslint-disable @typescript-eslint/no-explicit-any */

export type Row = Record<string, any>;

export function parseJson<T = unknown>(value: unknown): T | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

/** D1 stores booleans as 0/1/NULL. */
export function bool(value: unknown): boolean | null {
  if (value === null || value === undefined) return null;
  return value === 1 || value === true || value === '1';
}

export function str(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value);
  return s.trim() === '' ? null : s;
}

export function num(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** First non-null of shop value then brand default. */
export function merged<T>(shopValue: T | null, brandValue: T | null): T | null {
  return shopValue ?? brandValue ?? null;
}

export function image(url: unknown, formats: unknown, width: unknown = null, height: unknown = null): Image | null {
  const u = str(url);
  if (!u) return null;
  const f = parseJson<Record<string, any>>(formats) ?? {};
  return {
    url: u,
    width: num(width),
    height: num(height),
    formats: {
      thumbnail: variant(f.thumbnail),
      small: variant(f.small),
      medium: variant(f.medium),
      large: variant(f.large),
    },
  };
}

/** A Strapi media object as stored whole inside JSON columns (gallery, menus). */
export function mediaObject(media: any): Image | null {
  if (!media || typeof media !== 'object') return null;
  return image(media.url, media.formats, media.width, media.height);
}

function variant(v: any): ImageVariant | null {
  if (!v || typeof v !== 'object' || typeof v.url !== 'string') return null;
  return { url: v.url, width: num(v.width), height: num(v.height) };
}

export function links(row: Row, fallback: Row | null = null): SocialLinks {
  const pick = (key: string) => merged(str(row[key]), fallback ? str(fallback[key]) : null);
  return {
    website: pick('website'),
    instagram: pick('instagram'),
    facebook: pick('facebook'),
    tiktok: pick('tiktok'),
    twitter: pick('twitter'),
    youtube: pick('youtube'),
  };
}

/**
 * Story fields are plain text or Strapi rich-text blocks (stored as JSON).
 * Returns paragraphs separated by a blank line.
 */
export function plainText(value: unknown): string | null {
  const s = typeof value === 'string' ? value.trim() : value;
  if (s === null || s === undefined || s === '') return null;

  let blocks: unknown = s;
  if (typeof s === 'string') {
    if (!s.startsWith('[')) return s;
    blocks = parseJson(s);
    if (!Array.isArray(blocks)) return s;
  }
  if (!Array.isArray(blocks)) return null;

  const paragraphs = blocks.map((block: any) => childrenText(block?.children).trim()).filter(Boolean);
  return paragraphs.length > 0 ? paragraphs.join('\n\n') : null;
}

function childrenText(children: any): string {
  if (!Array.isArray(children)) return '';
  return children
    .map((child: any) => (typeof child?.text === 'string' ? child.text : childrenText(child?.children)))
    .join('');
}
