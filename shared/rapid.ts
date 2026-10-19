import {type CountryInfo, countryInfo, countryInfos, countryLabel} from './geo/countries';
import {canBeOption, WORLD_VIEW} from './geo/regions';
import {mulberry32} from './rounds';
import type {BBox, RapidConfig, RapidRound, RoundSpec, VideoProps} from './types';

/**
 * Difficulty = how well-known a country is (not its size). Names are world-atlas names
 * (checked by `npm run validate-data`). Everything else that is big enough to see is "hard".
 */
export const RAPID_EASY = [
  'United States of America', 'Canada', 'Mexico', 'Brazil', 'Argentina', 'Chile', 'Peru', 'Colombia',
  'United Kingdom', 'Ireland', 'Iceland', 'France', 'Spain', 'Portugal', 'Italy', 'Germany', 'Greece', 'Norway',
  'Sweden', 'Finland', 'Poland', 'Ukraine', 'Turkey', 'Egypt', 'Morocco', 'South Africa', 'Nigeria', 'Kenya',
  'Madagascar', 'Saudi Arabia', 'Iran', 'India', 'China', 'Japan', 'South Korea', 'Thailand', 'Vietnam',
  'Indonesia', 'Philippines', 'Australia', 'New Zealand', 'Mongolia', 'Kazakhstan', 'Pakistan',
];
export const RAPID_MEDIUM = [
  'Venezuela', 'Bolivia', 'Ecuador', 'Paraguay', 'Uruguay', 'Cuba', 'Guatemala', 'Panama', 'Costa Rica', 'Jamaica',
  'Netherlands', 'Belgium', 'Switzerland', 'Austria', 'Czechia', 'Hungary', 'Romania', 'Bulgaria', 'Serbia',
  'Croatia', 'Denmark', 'Belarus', 'Lithuania', 'Latvia', 'Estonia', 'Georgia', 'Algeria', 'Libya', 'Tunisia',
  'Ethiopia', 'Sudan', 'Tanzania', 'Dem. Rep. Congo', 'Angola', 'Ghana', 'Cameroon', 'Senegal', 'Somalia',
  'Mozambique', 'Namibia', 'Zimbabwe', 'Iraq', 'Syria', 'Israel', 'Jordan', 'Yemen', 'Oman',
  'United Arab Emirates', 'Afghanistan', 'Uzbekistan', 'Nepal', 'Bangladesh', 'Sri Lanka', 'Myanmar', 'Cambodia',
  'Laos', 'Malaysia', 'North Korea', 'Taiwan', 'Papua New Guinea',
];

/** Countries big enough to recognise on a regional map. */
function candidates(): CountryInfo[] {
  return countryInfos().filter((c) => c.sub && c.area >= 2e-4 && canBeOption(c.name));
}

function tier(level: Exclude<RapidConfig['difficulty'], 'mixed'>): CountryInfo[] {
  const list = candidates();
  if (level === 'easy') return list.filter((c) => RAPID_EASY.includes(c.name));
  if (level === 'medium') return list.filter((c) => RAPID_MEDIUM.includes(c.name));
  return list.filter((c) => !RAPID_EASY.includes(c.name) && !RAPID_MEDIUM.includes(c.name));
}

/**
 * Picks `count` countries for a rapid episode, deterministic for a seed.
 * 'mixed' goes from easy to hard like the classic format does.
 */
export function pickRapidCountries(seed: number, count: number, difficulty: RapidConfig['difficulty']): string[] {
  const rnd = mulberry32(seed * 104729 + 7);
  const picked: string[] = [];
  for (let i = 0; i < count; i++) {
    const level = difficulty === 'mixed' ? (['easy', 'medium', 'hard'] as const)[Math.min(2, Math.floor((i / count) * 3))] : difficulty;
    const pool = tier(level).filter((c) => !picked.includes(c.name));
    // avoid two neighbours in a row (same subregion) when possible
    const prevSub = picked.length ? countryInfo(picked[picked.length - 1])?.sub : undefined;
    const varied = pool.filter((c) => c.sub !== prevSub);
    const from = varied.length ? varied : pool;
    if (!from.length) break;
    picked.push(from[Math.floor(rnd() * from.length)].name);
  }
  return picked;
}

export const defaultRapid = (seed: number): RapidConfig => ({
  title: 'Guess the Country',
  seconds: 3,
  difficulty: 'mixed',
  rounds: pickRapidCountries(seed, 10, 'mixed').map((country) => ({kind: 'country', country})),
});

export type RapidRoundPlan = {
  index: number;
  label: string;
  /** Map view while guessing (country rounds; photo rounds keep the previous view) */
  view: BBox;
  /** MapView spec for country rounds */
  spec?: RoundSpec;
  round: RapidRound;
};

/**
 * Map view centred on the country with its neighbours around it (shape + location are the clue):
 * ~2.6× the country's extent, at least ~28° × 20° so small countries still have context.
 */
function countryView(c: CountryInfo): BBox {
  const [[w, s], [e, n]] = c.bounds;
  let span = e >= w ? e - w : e + 360 - w;
  let [cx, cy] = [w + span / 2, (s + n) / 2];
  if (span > 120) {
    // Russia-sized: frame around the centroid instead of the whole extent
    [cx, cy] = c.center;
    span = 120;
  }
  const lonHalf = Math.max(span * 1.3, 14);
  const latHalf = Math.max(((n - s) * 2.6) / 2, 10);
  return [cx - lonHalf, Math.max(cy - latHalf, -78), cx + lonHalf, Math.min(cy + latHalf, 82)];
}

export function rapidPlan(props: VideoProps): RapidRoundPlan[] {
  const rounds = props.rapid?.rounds ?? [];
  let view: BBox = WORLD_VIEW;
  return rounds.map((round, index) => {
    if (round.kind === 'photo') return {index, label: round.answer || '?', view, round};
    const c = countryInfo(round.country);
    if (!c?.sub) return {index, label: countryLabel(round.country), view, round};
    view = countryView(c);
    const label = countryLabel(c.name);
    const spec: RoundSpec = {
      index: 2,
      question: 'Name this country',
      view,
      kind: 'countries',
      options: [{letter: 'A', label, regionId: c.name, point: c.center, correct: true}],
      answerLabel: label,
    };
    return {index, label, view, spec, round};
  });
}

/** Countries offered in the round editor: big enough to see, sorted by display name. */
export const rapidCountryChoices = () =>
  candidates()
    .map((c) => ({name: c.name, label: countryLabel(c.name)}))
    .sort((a, b) => a.label.localeCompare(b.label));
