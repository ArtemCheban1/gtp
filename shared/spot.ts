import {type CountryInfo, countryInfo, countryInfos, countryLabel} from './geo/countries';
import {canBeOption} from './geo/regions';
import {RAPID_EASY, RAPID_MEDIUM} from './rapid';
import {mulberry32} from './rounds';
import type {BBox, SpotConfig, SpotRound, VideoProps} from './types';

/** Map areas for "What's wrong with this map?" — views are [west, south, east, north]. */
/** `subs`: subregions (shared/geo/regions.ts) whose countries can be the changed one on this map. */
export const SPOT_AREAS: {id: string; name: string; view: BBox; subs: string[]}[] = [
  {id: 'europe', name: 'Europe', view: [-12, 35, 34, 64], subs: ['eu-west', 'eu-east']},
  {id: 'africa', name: 'Africa', view: [-20, -36, 54, 38], subs: ['af-north', 'af-west', 'af-east', 'af-south']},
  {id: 'south-america', name: 'South America', view: [-84, -56, -33, 13], subs: ['am-brazil', 'am-south']},
  {id: 'north-america', name: 'North & Central America', view: [-120, 6, -58, 50], subs: ['am-north', 'am-central']},
  {id: 'middle-east', name: 'Middle East', view: [24, 11, 64, 43], subs: ['as-west']},
  {id: 'east-asia', name: 'East & South Asia', view: [62, 4, 146, 50], subs: ['as-east']},
  {id: 'se-asia', name: 'South-East Asia', view: [92, -12, 142, 26], subs: ['as-east']},
  {id: 'oceania', name: 'Oceania', view: [110, -48, 180, 0], subs: ['oc-west', 'oc-east', 'oc-nz', 'oc-pacific']},
];
export const spotArea = (id: string) => SPOT_AREAS.find((a) => a.id === id) ?? SPOT_AREAS[0];

/** ~12 000 km²: anything smaller is too hard to notice even when enlarged */
const MIN_AREA = 3e-4;

const span = (c: CountryInfo) => {
  const [[w], [e]] = c.bounds;
  return e >= w ? e - w : e + 360 - w;
};

/** Lon/lat box of the country enlarged `k`× around its centre. */
function scaledBox(c: CountryInfo, k: number): BBox {
  const [[w, s], [, n]] = c.bounds;
  const sp = span(c);
  const [cx, cy] = [w + sp / 2, (s + n) / 2];
  return [cx - (sp / 2) * k, cy - ((n - s) / 2) * k, cx + (sp / 2) * k, cy + ((n - s) / 2) * k];
}

/**
 * The country belongs to the area (centre inside its view) and, enlarged `k`×, takes at most ~60% of
 * the view's width/height — bigger than that it just covers everything.
 */
function usable(c: CountryInfo, view: BBox, k: number): boolean {
  const [vw, vs, ve, vn] = view;
  const [cx, cy] = [c.bounds[0][0] + span(c) / 2, (c.bounds[0][1] + c.bounds[1][1]) / 2];
  if (cx < vw || cx > ve || cy < vs || cy > vn) return false;
  const [w, s, e, n] = scaledBox(c, k);
  return e - w <= (ve - vw) * 0.6 && n - s <= (vn - vs) * 0.6;
}

/** Area view grown so the enlarged country is fully visible. */
function viewFor(c: CountryInfo, view: BBox, k: number): BBox {
  const [w, s, e, n] = scaledBox(c, k);
  return [Math.min(view[0], w - 2), Math.max(-78, Math.min(view[1], s - 2)), Math.max(view[2], e + 2), Math.min(82, Math.max(view[3], n + 2))];
}

/** Countries of an area that can be the changed one, biggest first. */
export function spotCandidates(areaId: string, k = 1.5): CountryInfo[] {
  const {view, subs} = spotArea(areaId);
  return countryInfos()
    .filter((c) => c.area >= MIN_AREA && canBeOption(c.name) && !!c.sub && subs.includes(c.sub) && usable(c, view, k))
    .sort((a, b) => b.area - a.area);
}

/** Difficulty by round position: rounds 1–2 easy, then medium, last one(s) hard. */
function level(i: number, count: number): 'easy' | 'medium' | 'hard' {
  const t = count <= 1 ? 0 : i / (count - 1);
  return t < 0.3 ? 'easy' : t < 0.8 ? 'medium' : 'hard';
}
const SCALE = {easy: [1.6, 1.7], medium: [1.4, 1.5], hard: [1.3, 1.3]} as const;

/** Picks a whole episode: a different area per round, harder towards the end. Deterministic per seed. */
export function pickSpotRounds(seed: number, count: number): SpotRound[] {
  const rnd = mulberry32(seed * 7907 + 3);
  const areas = [...SPOT_AREAS];
  for (let i = areas.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [areas[i], areas[j]] = [areas[j], areas[i]];
  }
  const rounds: SpotRound[] = [];
  for (let i = 0; i < count; i++) {
    const lv = level(i, count);
    const [lo, hi] = SCALE[lv];
    const scale = Math.round((lo + rnd() * (hi - lo)) * 10) / 10;
    // try areas in shuffled order until one has a candidate for this level
    for (let a = 0; a < areas.length; a++) {
      const area = areas[(i + a) % areas.length];
      const list = spotCandidates(area.id, scale).filter((c) => !rounds.some((r) => r.country === c.name));
      if (!list.length) continue;
      // easy = well-known countries, medium = the next tier, hard = small / lesser-known ones
      const famous = list.filter((c) => RAPID_EASY.includes(c.name));
      const known = list.filter((c) => RAPID_MEDIUM.includes(c.name));
      const rest = list.filter((c) => !famous.includes(c) && !known.includes(c));
      const tier = lv === 'easy' ? famous : lv === 'medium' ? known : rest.slice(Math.floor(rest.length / 3));
      const pool = tier.length ? tier : list;
      rounds.push({area: area.id, country: pool[Math.floor(rnd() * pool.length)].name, scale});
      break;
    }
  }
  return rounds;
}

export const defaultSpot = (seed: number): SpotConfig => ({
  title: "What's wrong with this map?",
  seconds: 6,
  rounds: pickSpotRounds(seed, 5),
});

export type SpotRoundPlan = {
  index: number;
  view: BBox;
  country: string;
  /** Display name */
  label: string;
  scale: number;
  /** Centre the country is enlarged around (lon/lat of its main polygon) */
  center: [number, number];
};

export function spotPlan(props: VideoProps): SpotRoundPlan[] {
  return (props.spot?.rounds ?? []).flatMap((r, index) => {
    const c = countryInfo(r.country);
    if (!c) return [];
    const [[w, s], [, n]] = c.bounds;
    const center: [number, number] = [w + span(c) / 2, (s + n) / 2];
    return [{index, view: viewFor(c, spotArea(r.area).view, r.scale), country: c.name, label: countryLabel(c.name), scale: r.scale, center}];
  });
}

/** "Italy was 1.6× bigger" */
export const spotAnswer = (p: Pick<SpotRoundPlan, 'label' | 'scale'>) => `${p.label} was ${p.scale}× bigger`;
