import {geoArea} from 'd3-geo';
import {type CountryInfo, countryInfos, countryLabel} from './geo/countries';
import {canBeOption} from './geo/regions';
import {COUNTRIES} from './geo/world';
import {RAPID_EASY, RAPID_MEDIUM} from './rapid';
import {mulberry32} from './rounds';
import type {VersusConfig, VersusQuestion, VersusRound, VideoProps} from './types';

const EARTH_R = 6371;

/** Total land area in km² (all parts of the country, as in official figures). */
export function areaKm2(country: string): number {
  const f = COUNTRIES.find((c) => c.properties.name === country);
  return f ? geoArea(f) * EARTH_R * EARTH_R : 0;
}

/** Latitude of the country's main part (its centre) — what "farther north" compares. */
export const centreLat = (c: CountryInfo) => c.center[1];

const latSpan = (c: CountryInfo) => c.bounds[1][1] - c.bounds[0][1];

export const QUESTIONS: Record<VersusQuestion, {text: string; short: string}> = {
  bigger: {text: 'Which is bigger?', short: 'Bigger'},
  north: {text: 'Which is farther north?', short: 'Farther north'},
};

function pool(): CountryInfo[] {
  return countryInfos().filter((c) => c.sub && c.area >= 2e-4 && canBeOption(c.name) && (RAPID_EASY.includes(c.name) || RAPID_MEDIUM.includes(c.name)));
}

/**
 * A tricky pair for the question:
 *  bigger — sizes within ~1.6× of each other, and the smaller one is the one closer to a pole
 *           (it looks bigger on the usual Mercator maps), on different continents when possible;
 *  north  — centres 1–8° of latitude apart, on different continents, neither stretching over >15° of latitude.
 */
function pickPair(q: VersusQuestion, rnd: () => number, used: Set<string>): VersusRound | null {
  const list = pool().filter((c) => !used.has(c.name));
  const pairs: [CountryInfo, CountryInfo][] = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const [x, y] = [list[i], list[j]];
      if (x.zone === y.zone) continue;
      if (q === 'bigger') {
        const [ax, ay] = [areaKm2(x.name), areaKm2(y.name)];
        const ratio = Math.max(ax, ay) / Math.min(ax, ay);
        if (ratio < 1.08 || ratio > 1.6) continue;
        const smaller = ax < ay ? x : y;
        const bigger = smaller === x ? y : x;
        if (Math.abs(centreLat(smaller)) <= Math.abs(centreLat(bigger)) + 5) continue; // no Mercator trap
        pairs.push([x, y]);
      } else {
        // long countries (Chile, Canada…) have no clear "position" — keep north/south questions fair
        if (latSpan(x) > 15 || latSpan(y) > 15) continue;
        const d = Math.abs(centreLat(x) - centreLat(y));
        if (d < 1 || d > 8) continue;
        pairs.push([x, y]);
      }
    }
  }
  if (!pairs.length) return null;
  const [x, y] = pairs[Math.floor(rnd() * pairs.length)];
  return rnd() < 0.5 ? {question: q, a: x.name, b: y.name} : {question: q, a: y.name, b: x.name};
}

/** An episode: questions alternate (bigger, north, bigger…), no country twice. Deterministic per seed. */
export function pickVersusRounds(seed: number, count: number): VersusRound[] {
  const rnd = mulberry32(seed * 6271 + 11);
  const used = new Set<string>();
  const rounds: VersusRound[] = [];
  for (let i = 0; i < count; i++) {
    const r = pickPair(i % 2 === 0 ? 'bigger' : 'north', rnd, used);
    if (!r) break;
    used.add(r.a);
    used.add(r.b);
    rounds.push(r);
  }
  return rounds;
}

export const defaultVersus = (seed: number): VersusConfig => ({title: 'Which is bigger?', seconds: 5, rounds: pickVersusRounds(seed, 5)});

const fmtArea = (km2: number) => (km2 >= 1e6 ? `${(km2 / 1e6).toFixed(2)}M km²` : `${Math.round(km2 / 1000).toLocaleString('en-US')}k km²`);
const fmtLat = (lat: number) => `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}`;

export type VersusRoundPlan = {
  index: number;
  question: VersusQuestion;
  a: {name: string; label: string; value: string};
  b: {name: string; label: string; value: string};
  /** 'a' or 'b' */
  winner: 'a' | 'b';
};

export function versusPlan(props: VideoProps): VersusRoundPlan[] {
  const infos = new Map(countryInfos().map((c) => [c.name, c]));
  return (props.versus?.rounds ?? []).flatMap((r, index) => {
    const [ia, ib] = [infos.get(r.a), infos.get(r.b)];
    if (!ia || !ib) return [];
    const va = r.question === 'bigger' ? areaKm2(r.a) : centreLat(ia);
    const vb = r.question === 'bigger' ? areaKm2(r.b) : centreLat(ib);
    const fmt = r.question === 'bigger' ? fmtArea : fmtLat;
    return [
      {
        index,
        question: r.question,
        a: {name: r.a, label: countryLabel(r.a), value: fmt(va)},
        b: {name: r.b, label: countryLabel(r.b), value: fmt(vb)},
        winner: va >= vb ? 'a' : 'b',
      },
    ];
  });
}

/** "Algeria is bigger than DR Congo" style one-liner for answers and captions. */
export const versusAnswer = (p: VersusRoundPlan) => {
  const [w, l] = p.winner === 'a' ? [p.a, p.b] : [p.b, p.a];
  return p.question === 'bigger' ? `${w.label} > ${l.label}` : `${w.label} is farther north`;
};

export const versusChoices = () =>
  pool()
    .map((c) => ({name: c.name, label: countryLabel(c.name)}))
    .sort((a, b) => a.label.localeCompare(b.label));
