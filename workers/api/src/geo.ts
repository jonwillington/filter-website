import type { Bounds, Coordinates } from '../../../types/api-v3';

/** Accepts [{lat, lng}] or GeoJSON-order [[lng, lat]]. Returns null for anything else. */
export function parseOutline(raw: unknown): Coordinates[] | null {
  const value = typeof raw === 'string' ? safeJson(raw) : raw;
  if (!Array.isArray(value) || value.length === 0) return null;

  const points: Coordinates[] = [];
  for (const p of value) {
    if (Array.isArray(p) && typeof p[0] === 'number' && typeof p[1] === 'number') {
      points.push({ lat: p[1], lng: p[0] });
    } else if (p && typeof p === 'object' && typeof (p as Coordinates).lat === 'number' && typeof (p as Coordinates).lng === 'number') {
      points.push({ lat: (p as Coordinates).lat, lng: (p as Coordinates).lng });
    }
  }
  return points.length > 0 ? points : null;
}

export function parsePoint(raw: unknown): Coordinates | null {
  const value = typeof raw === 'string' ? safeJson(raw) : raw;
  if (value && typeof value === 'object' && typeof (value as Coordinates).lat === 'number' && typeof (value as Coordinates).lng === 'number') {
    return { lat: (value as Coordinates).lat, lng: (value as Coordinates).lng };
  }
  return null;
}

export function boundsOf(points: Coordinates[]): Bounds | null {
  if (points.length === 0) return null;
  let north = -90, south = 90, east = -180, west = 180;
  for (const p of points) {
    north = Math.max(north, p.lat);
    south = Math.min(south, p.lat);
    east = Math.max(east, p.lng);
    west = Math.min(west, p.lng);
  }
  return { north, south, east, west };
}

/** Median point: stays on the dense cluster when a few shops are far out. */
export function medianPoint(points: Coordinates[]): Coordinates | null {
  if (points.length === 0) return null;
  const median = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };
  return { lat: median(points.map(p => p.lat)), lng: median(points.map(p => p.lng)) };
}

/**
 * Douglas–Peucker, loosening the tolerance until the outline fits `maxPoints`.
 * Coordinates are rounded to 5 decimals (~1 m).
 */
export function simplifyOutline(points: Coordinates[], maxPoints: number): Coordinates[] {
  const rounded = points.map(p => ({ lat: round5(p.lat), lng: round5(p.lng) }));
  if (rounded.length <= maxPoints) return rounded;

  let tolerance = 0.00005;
  let result = rounded;
  for (let i = 0; i < 20 && result.length > maxPoints; i++) {
    result = douglasPeucker(rounded, tolerance);
    tolerance *= 1.6;
  }
  return result;
}

function douglasPeucker(points: Coordinates[], tolerance: number): Coordinates[] {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;

  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [start, end] = stack.pop()!;
    let maxDistance = 0;
    let index = -1;
    for (let i = start + 1; i < end; i++) {
      const d = perpendicularDistance(points[i], points[start], points[end]);
      if (d > maxDistance) {
        maxDistance = d;
        index = i;
      }
    }
    if (index !== -1 && maxDistance > tolerance) {
      keep[index] = 1;
      stack.push([start, index], [index, end]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function perpendicularDistance(p: Coordinates, a: Coordinates, b: Coordinates): number {
  const dx = b.lng - a.lng;
  const dy = b.lat - a.lat;
  if (dx === 0 && dy === 0) return Math.hypot(p.lng - a.lng, p.lat - a.lat);
  const t = ((p.lng - a.lng) * dx + (p.lat - a.lat) * dy) / (dx * dx + dy * dy);
  const clamped = Math.max(0, Math.min(1, t));
  return Math.hypot(p.lng - (a.lng + clamped * dx), p.lat - (a.lat + clamped * dy));
}

function round5(n: number): number {
  return Math.round(n * 100000) / 100000;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
