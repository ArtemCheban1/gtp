import type {BBox, LonLat} from '../types';

/** East edge as a value > west, even when the box crosses the antimeridian. */
export const unwrappedEast = (b: BBox) => (b[2] < b[0] ? b[2] + 360 : b[2]);

export function inBox(p: LonLat, b: BBox): boolean {
  const [w, s, , n] = b;
  if (p[1] < s || p[1] > n) return false;
  const e = unwrappedEast(b);
  const lon = p[0] < w ? p[0] + 360 : p[0];
  return lon >= w && lon <= e;
}

/** Box around a point, ~`km` across, used when a place has to be centred on screen. */
export function boxAround(p: LonLat, km: number): BBox {
  const dLat = km / 2 / 111;
  const dLon = dLat / Math.max(0.2, Math.cos((p[1] * Math.PI) / 180));
  return [p[0] - dLon, p[1] - dLat, p[0] + dLon, p[1] + dLat];
}
