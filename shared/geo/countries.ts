import type {MultiPolygon, Polygon} from 'geojson';
import {geoArea, geoBounds, geoCentroid, geoDistance} from 'd3-geo';
import type {LonLat} from '../types';
import {canBeOption, subById} from './regions';
import {COUNTRIES, subForCountryPoint} from './world';

/** world-atlas abbreviates many names; this is how they read in the video. */
const DISPLAY: Record<string, string> = {
  'United States of America': 'USA',
  'Dem. Rep. Congo': 'DR Congo',
  'Central African Rep.': 'Central African Rep.',
  'Dominican Rep.': 'Dominican Republic',
  'Bosnia and Herz.': 'Bosnia & Herzegovina',
  'Eq. Guinea': 'Equatorial Guinea',
  'S. Sudan': 'South Sudan',
  'W. Sahara': 'Western Sahara',
  'Solomon Is.': 'Solomon Islands',
  'Marshall Is.': 'Marshall Islands',
  'Falkland Is.': 'Falkland Islands',
  'Fr. Polynesia': 'French Polynesia',
  'N. Cyprus': 'Northern Cyprus',
  'Antigua and Barb.': 'Antigua & Barbuda',
  'St. Vin. and Gren.': 'St Vincent & Grenadines',
  'St. Kitts and Nevis': 'St Kitts & Nevis',
  'Faeroe Is.': 'Faroe Islands',
};
export const countryLabel = (name: string) => DISPLAY[name] ?? name;

export type CountryInfo = {
  name: string;
  /** Centroid of the largest polygon (overseas territories don't drag it away) */
  center: LonLat;
  /** [[w, s], [e, n]] of the largest polygon */
  bounds: [LonLat, LonLat];
  /** Steradians, largest polygon */
  area: number;
  sub?: string;
  zone?: string;
};

function mainPolygon(g: Polygon | MultiPolygon): Polygon {
  if (g.type === 'Polygon') return g;
  let best: Polygon = {type: 'Polygon', coordinates: g.coordinates[0]};
  let bestArea = geoArea(best);
  for (const coords of g.coordinates.slice(1)) {
    const p: Polygon = {type: 'Polygon', coordinates: coords};
    const a = geoArea(p);
    if (a > bestArea) [best, bestArea] = [p, a];
  }
  return best;
}

let cache: CountryInfo[] | null = null;
/** Lazily computed — only the "countries" round-3 mode needs it. */
export function countryInfos(): CountryInfo[] {
  if (!cache) {
    cache = COUNTRIES.map((c) => {
      const poly = mainPolygon(c.geometry);
      const center = geoCentroid(poly) as LonLat;
      const sub = subForCountryPoint(c.properties.name, center);
      return {
        name: c.properties.name,
        center,
        bounds: geoBounds(poly) as [LonLat, LonLat],
        area: geoArea(poly),
        sub,
        zone: sub ? subById(sub)?.zone : undefined,
      };
    });
  }
  return cache;
}

export const countryInfo = (name: string) => countryInfos().find((c) => c.name === name);

/** ~4000 km²: smaller countries are barely visible at region zoom, so they're never used as decoys. */
const MIN_DECOY_AREA = 1e-4;

/**
 * The 3 wrong countries for round 3: among the 8 nearest sizeable countries in the same subregion
 * (or the same zone when the subregion has too few), picked with `rnd` so their badges don't crowd.
 */
export function pickDecoyCountries(answer: string, subId: string, rnd: () => number): CountryInfo[] | null {
  const me = countryInfo(answer);
  if (!me) return null;
  const pool = (filter: (c: CountryInfo) => boolean) =>
    countryInfos()
      .filter((c) => c.name !== answer && canBeOption(c.name) && c.area >= MIN_DECOY_AREA && filter(c))
      .sort((a, b) => geoDistance(a.center, me.center) - geoDistance(b.center, me.center));
  let candidates = pool((c) => c.sub === subId);
  if (candidates.length < 3) candidates = pool((c) => c.zone === subById(subId)?.zone);
  if (candidates.length < 3) return null;
  const near = candidates.slice(0, 8);
  for (let i = near.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [near[i], near[j]] = [near[j], near[i]];
  }
  // Keep the badges apart: prefer countries whose centres are well away from the answer and each other
  const km = (a: CountryInfo, b: CountryInfo) => geoDistance(a.center, b.center) * 6371;
  for (const minKm of [600, 400, 250, 0]) {
    const picked: CountryInfo[] = [];
    for (const c of near) {
      if ([me, ...picked].every((p) => km(p, c) >= minKm)) picked.push(c);
      if (picked.length === 3) return picked;
    }
  }
  return near.slice(0, 3);
}
