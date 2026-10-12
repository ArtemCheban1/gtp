/**
 * Sanity checks for shared/geo data. Run: npm run validate-data
 *  - every country in the map belongs to a subregion
 *  - every region references real country names
 *  - every curated city lands in a subregion (and in the country it claims, when the names match)
 *  - every subregion has enough cities for round-3 decoys
 */
import {COUNTRIES, resolvePoint} from '../shared/geo/world';
import {CITIES} from '../shared/geo/cities';
import {LON_SPLITS, SUBREGIONS, BOX_OVERRIDES} from '../shared/geo/regions';
import {citiesInSub} from '../shared/rounds';

let problems = 0;
const fail = (msg: string) => {
  problems++;
  console.log('✗ ' + msg);
};

const mapNames = new Set(COUNTRIES.map((c) => c.properties.name));
const assigned = new Set<string>([...SUBREGIONS.flatMap((s) => s.countries), ...LON_SPLITS.map((s) => s.country)]);

for (const name of assigned) if (!mapNames.has(name)) fail(`region lists unknown country "${name}"`);
for (const o of BOX_OVERRIDES) if (!mapNames.has(o.country)) fail(`override for unknown country "${o.country}"`);
for (const name of mapNames) if (!assigned.has(name)) fail(`country "${name}" is in no subregion`);

const ALIASES: Record<string, string> = {
  USA: 'United States of America',
  'Dominican Republic': 'Dominican Rep.',
  'Bosnia and Herzegovina': 'Bosnia and Herz.',
  'DR Congo': 'Dem. Rep. Congo',
  'South Sudan': 'S. Sudan',
  'Solomon Islands': 'Solomon Is.',
  'French Polynesia': 'Fr. Polynesia',
  'Cook Islands': 'Cook Is.',
  'French Guiana': 'France',
  'Hong Kong': 'Hong Kong',
};

for (const c of CITIES) {
  const r = resolvePoint([c.lon, c.lat]);
  if (!r) {
    fail(`city ${c.name} (${c.country}) is not on land`);
    continue;
  }
  const expected = ALIASES[c.country!] ?? c.country;
  if (r.country !== expected && !(c.country === 'China' && r.country === 'Hong Kong')) {
    fail(`city ${c.name}: claims ${c.country}, map says ${r.country}`);
  }
}

for (const s of SUBREGIONS) {
  const n = citiesInSub(s.id).length;
  if (n < 6) fail(`subregion ${s.id} has only ${n} cities (need ≥ 6 for good decoys)`);
  else console.log(`✓ ${s.id.padEnd(11)} ${n} cities`);
}

console.log(problems ? `\n${problems} problem(s)` : '\nAll good');
process.exit(problems ? 1 : 0);
