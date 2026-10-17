import {CITIES} from './geo/cities';
import {SUBREGIONS, ZONES, subById, subsOfZone, zoneById, WORLD_VIEW} from './geo/regions';
import {type CountryInfo, countryInfo, countryLabel, pickDecoyCountries} from './geo/countries';
import {distanceKm, resolvePoint} from './geo/world';
import type {BBox, LonLat, MapOption, OptionLetter, Place, RoundSpec, VideoProps} from './types';

const LETTERS: OptionLetter[] = ['A', 'B', 'C', 'D'];

/** Deterministic PRNG so the same seed always gives the same video. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ll = (p: Place): LonLat => [p.lon, p.lat];

/** Subregion id of a place (manual override wins). */
export function placeSubId(place: Place): string | null {
  if (place.subId && subById(place.subId)) return place.subId;
  return resolvePoint(ll(place))?.sub ?? null;
}

const cityCache = new Map<string, Place[]>();
export function citiesInSub(subId: string): Place[] {
  let list = cityCache.get(subId);
  if (!list) {
    list = CITIES.filter((c) => resolvePoint(ll(c))?.sub === subId);
    cityCache.set(subId, list);
  }
  return list;
}

/**
 * Auto-picks round-3 wrong answers: the nearest cities in the same subregion that are still far enough
 * from the answer (and from each other) to be told apart on the map. Near = harder and a tighter map.
 */
export function pickDecoys(place: Place, subId: string, seed: number, count = 3): Place[] {
  const rnd = mulberry32(seed * 7919 + 17);
  const dist = (c: Place) => distanceKm(ll(c), ll(place));
  const candidates = citiesInSub(subId)
    .filter((c) => c.name !== place.name)
    .sort((a, b) => dist(a) - dist(b));
  for (const minKm of [400, 250, 120, 0]) {
    const eligible = candidates.filter((c) => dist(c) >= minKm);
    const pool = shuffle(eligible.slice(0, 7), rnd);
    const picked: Place[] = [];
    for (const c of pool) {
      if (picked.every((p) => distanceKm(ll(p), ll(c)) >= minKm * 0.7)) picked.push(c);
      if (picked.length === count) return picked;
    }
  }
  return candidates.slice(0, count);
}

/** Decoys from props, with blanks filled automatically. */
export function effectiveDecoys(props: VideoProps, subId: string): Place[] {
  const manual = props.decoys.filter((d) => d && d.name && Number.isFinite(d.lat) && Number.isFinite(d.lon));
  if (manual.length >= 3) return manual.slice(0, 3);
  const auto = pickDecoys(props.place, subId, props.seed).filter((a) => !manual.some((m) => m.name === a.name));
  return [...manual, ...auto].slice(0, 3);
}

/** Box that tightly frames all round-3 pins (handles the antimeridian). */
function framePoints(points: LonLat[]): BBox {
  const ref = points[0][0];
  const lons = points.map(([lon]) => (lon - ref > 180 ? lon - 360 : lon - ref < -180 ? lon + 360 : lon));
  const lats = points.map(([, lat]) => lat);
  let [w, e] = [Math.min(...lons), Math.max(...lons)];
  let [s, n] = [Math.min(...lats), Math.max(...lats)];
  const padLon = Math.max((e - w) * 0.22, 2.5);
  const padLat = Math.max((n - s) * 0.22, 2);
  w -= padLon;
  e += padLon;
  s -= padLat;
  n += padLat;
  return [w, Math.max(s, -80), e, Math.min(n, 82)];
}

export type Plan = {
  zoneId: string;
  subId: string;
  rounds: [RoundSpec, RoundSpec, RoundSpec];
  decoys: Place[];
} | {error: string};

export function buildPlan(props: VideoProps): Plan {
  const subId = placeSubId(props.place);
  if (!subId) {
    return {error: `Can't tell which region (${props.place.lat}, ${props.place.lon}) is in. Pick the region manually.`};
  }
  const sub = subById(subId)!;
  const zone = zoneById(sub.zone)!;

  const r1: RoundSpec = {
    index: 0,
    question: 'Which part of the world?',
    view: WORLD_VIEW,
    kind: 'zones',
    options: ZONES.map<MapOption>((z) => ({
      letter: z.letter,
      label: z.name,
      regionId: z.id,
      correct: z.id === zone.id,
    })),
    answerLabel: zone.name,
  };

  const r2: RoundSpec = {
    index: 1,
    question: 'Which region?',
    view: zone.view,
    kind: 'subregions',
    focusId: zone.id,
    options: subsOfZone(zone.id).map<MapOption>((s) => ({
      letter: s.letter,
      label: s.name,
      regionId: s.id,
      correct: s.id === sub.id,
    })),
    answerLabel: sub.name,
  };

  const decoys = effectiveDecoys(props, subId);
  if (props.round3 === 'countries') {
    const r3 = countryRound(props, subId);
    if ('error' in r3) return r3;
    return {zoneId: zone.id, subId, rounds: [r1, r2, r3], decoys};
  }
  const order = shuffle([props.place, ...decoys], mulberry32(props.seed));
  const r3: RoundSpec = {
    index: 2,
    question: 'Where exactly?',
    view: framePoints(order.map(ll)),
    kind: 'points',
    focusId: sub.id,
    options: order.map<MapOption>((p, i) => ({
      letter: LETTERS[i],
      label: p.name,
      point: ll(p),
      correct: p === props.place,
    })),
    answerLabel: props.place.name,
  };

  return {zoneId: zone.id, subId, rounds: [r1, r2, r3], decoys};
}

/** Round 3 as "which country?" — the answer's country plus 3 nearby ones. */
function countryRound(props: VideoProps, subId: string): RoundSpec | {error: string} {
  const answer = resolvePoint(ll(props.place))?.country;
  const rnd = mulberry32(props.seed * 31 + 5);
  const decoys = answer ? pickDecoyCountries(answer, subId, rnd) : null;
  const me = answer ? countryInfo(answer) : undefined;
  if (!answer || !decoys || !me) {
    return {error: `Not enough countries around ${props.place.name} for a "which country?" round — switch round 3 to cities.`};
  }
  const order = shuffle([me, ...decoys], mulberry32(props.seed));
  // Very wide countries (Russia spans >180°) can't be framed whole, and framing them would shrink the
  // neighbours to dots: they are framed and labelled around a point instead — the place itself for the answer.
  const span = ({bounds: [[w], [e]]}: CountryInfo) => (e >= w ? e - w : e + 360 - w);
  const anchor = (c: CountryInfo): LonLat => (c === me ? ll(props.place) : c.center);
  const corners = order.flatMap((c): LonLat[] => {
    if (span(c) <= 120) return c.bounds;
    const [lon, lat] = anchor(c);
    return [
      [lon - 15, lat - 8],
      [lon + 15, lat + 8],
    ];
  });
  return {
    index: 2,
    question: 'Which country?',
    view: framePoints(corners),
    kind: 'countries',
    focusId: subId,
    options: order.map<MapOption>((c, i) => ({
      letter: LETTERS[i],
      label: countryLabel(c.name),
      regionId: c.name,
      point: span(c) > 120 ? anchor(c) : c.center,
      correct: c === me,
    })),
    answerLabel: countryLabel(answer),
  };
}

export {SUBREGIONS, ZONES};
