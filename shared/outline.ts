import type {Feature, MultiPolygon, Polygon} from 'geojson';
import {geoArea, geoBounds, geoCentroid} from 'd3-geo';
import {countryInfo, countryLabel} from './geo/countries';
import {COUNTRIES, subForCountryPoint} from './geo/world';
import {pickRapidCountries} from './rapid';
import type {OutlineConfig, VideoProps} from './types';

export const defaultOutline = (seed: number): OutlineConfig => ({
  title: 'Guess before 100%',
  seconds: 5,
  difficulty: 'mixed',
  rounds: pickRapidCountries(seed * 13 + 5, 5, 'mixed').map((country) => ({country})),
});

/**
 * The parts of a country worth drawing: its main polygon plus nearby parts in the same region
 * (France without French Guiana, USA without Alaska and Hawaii, Indonesia with all its islands).
 */
export function outlineShape(country: string): Feature<MultiPolygon> | null {
  const f = COUNTRIES.find((c) => c.properties.name === country);
  const info = countryInfo(country);
  if (!f || !info) return null;
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  // Parts in another region (French Guiana, Hawaii, Canary Islands…) would shrink the main shape to a dot
  const parts = polys
    .map((coords) => {
      const p: Polygon = {type: 'Polygon', coordinates: coords};
      return {coords, area: geoArea(p), centre: geoCentroid(p) as [number, number], box: geoBounds(p) as [[number, number], [number, number]]};
    })
    .filter((p) => !info.sub || subForCountryPoint(country, p.centre) === info.sub);
  if (!parts.length) return null;
  // …and so would far-away parts in the same region (Alaska, Svalbard). Keep a chain of parts within ~4°
  // of a part already kept, starting from the biggest — island countries stay whole.
  const gap = (a: (typeof parts)[number], b: (typeof parts)[number]) => {
    const lonGap = (x: [number, number], y: [number, number]) => {
      const d = (v: number) => ((((v + 180) % 360) + 360) % 360) - 180;
      // distance between two longitude intervals, with wrap-around
      const [x0, x1] = x;
      const [y0, y1] = y;
      const inside = (v: number, lo: number, hi: number) => (lo <= hi ? v >= lo && v <= hi : v >= lo || v <= hi);
      if (inside(y0, x0, x1) || inside(x0, y0, y1)) return 0;
      return Math.min(Math.abs(d(y0 - x1)), Math.abs(d(x0 - y1)));
    };
    const lat = Math.max(0, Math.max(a.box[0][1], b.box[0][1]) - Math.min(a.box[1][1], b.box[1][1]));
    const lon = lonGap([a.box[0][0], a.box[1][0]], [b.box[0][0], b.box[1][0]]);
    return Math.hypot(lat, lon);
  };
  const main = parts.reduce((m, p) => (p.area > m.area ? p : m));
  const kept = [main];
  // 1) chain of real islands/parts (≥1% of the main one) — tiny islets can't act as stepping stones
  const big = parts.filter((p) => p !== main && p.area >= main.area * 0.01);
  for (let grew = true; grew; ) {
    grew = false;
    for (let i = big.length - 1; i >= 0; i--) {
      if (kept.some((k) => gap(k, big[i]) <= 4)) {
        kept.push(...big.splice(i, 1));
        grew = true;
      }
    }
  }
  // 2) tiny islets only right next to what is kept
  for (const p of parts) if (p.area < main.area * 0.01 && kept.some((k) => gap(k, p) <= 1.5)) kept.push(p);
  return {type: 'Feature', properties: {}, geometry: {type: 'MultiPolygon', coordinates: kept.map((p) => p.coords)}};
}

export type OutlineRoundPlan = {index: number; country: string; label: string};

export const outlinePlan = (props: VideoProps): OutlineRoundPlan[] =>
  (props.outline?.rounds ?? []).flatMap((r, index) => (countryInfo(r.country) ? [{index, country: r.country, label: countryLabel(r.country)}] : []));
