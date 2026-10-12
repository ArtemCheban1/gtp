import type {Feature, MultiLineString, MultiPolygon, Polygon, Position} from 'geojson';
import {geoBounds, geoCentroid, geoContains, geoDistance} from 'd3-geo';
import {feature, mesh} from 'topojson-client';
import type {GeometryCollection, Topology} from 'topojson-specification';
import worldTopo from 'world-atlas/countries-50m.json';
import type {LonLat} from '../types';
import {BOX_OVERRIDES, LON_SPLITS, SUBREGIONS, subById} from './regions';
import {inBox} from './bbox';

type CountryProps = {name: string};

const topo = worldTopo as unknown as Topology<{countries: GeometryCollection<CountryProps>}>;

export const COUNTRIES: Feature<Polygon | MultiPolygon, CountryProps>[] = (
  feature(topo, topo.objects.countries) as unknown as {features: Feature<Polygon | MultiPolygon, CountryProps>[]}
).features.filter((f) => f.properties.name !== 'Antarctica');

/** All internal borders as one geometry — drawn as a single thin path. */
export const BORDERS: MultiLineString = mesh(
  topo,
  topo.objects.countries,
  (a, b) => a !== b,
) as MultiLineString;

const COUNTRY_TO_SUB = new Map<string, string>();
for (const s of SUBREGIONS) for (const c of s.countries) COUNTRY_TO_SUB.set(c, s.id);
// Countries whose default comes from a LON_SPLIT only
for (const split of LON_SPLITS) if (!COUNTRY_TO_SUB.has(split.country)) COUNTRY_TO_SUB.set(split.country, split.west);

/** Subregion of a point that is known to be inside `country`. */
export function subForCountryPoint(country: string, p: LonLat): string | undefined {
  const o = BOX_OVERRIDES.find((b) => b.country === country && inBox(p, b.box));
  if (o) return o.sub;
  const split = LON_SPLITS.find((s) => s.country === country);
  if (split) return p[0] < split.at ? split.west : split.east;
  return COUNTRY_TO_SUB.get(country);
}

export type LandGroup = {
  sub: string;
  zone: string;
  geometry: MultiPolygon;
  /** Only draw inside this longitude band (used for countries cut along a meridian). */
  lonRange?: [number, number];
};

function buildLandGroups(): LandGroup[] {
  const groups = new Map<string, LandGroup>();
  const add = (sub: string, coords: Position[][], lonRange?: [number, number]) => {
    const key = `${sub}|${lonRange?.join(',') ?? ''}`;
    let g = groups.get(key);
    if (!g) {
      g = {sub, zone: subById(sub)!.zone, geometry: {type: 'MultiPolygon', coordinates: []}, lonRange};
      groups.set(key, g);
    }
    g.geometry.coordinates.push(coords);
  };

  for (const c of COUNTRIES) {
    const name = c.properties.name;
    const polys = c.geometry.type === 'Polygon' ? [c.geometry.coordinates] : c.geometry.coordinates;
    for (const coords of polys) {
      const poly: Polygon = {type: 'Polygon', coordinates: coords};
      const centroid = geoCentroid(poly) as LonLat;
      const override = BOX_OVERRIDES.find((b) => b.country === name && inBox(centroid, b.box));
      if (override) {
        add(override.sub, coords);
        continue;
      }
      const split = LON_SPLITS.find((s) => s.country === name);
      if (split) {
        const [[w], [e]] = geoBounds(poly);
        // w > e: the polygon crosses the antimeridian (e.g. mainland Russia), so it always straddles the split
        if (w <= e && e <= split.at) add(split.west, coords);
        else if (w <= e && w >= split.at) add(split.east, coords);
        else {
          add(split.west, coords, [-180, split.at]);
          add(split.east, coords, [split.at, 180]);
        }
        continue;
      }
      const sub = COUNTRY_TO_SUB.get(name);
      if (sub) add(sub, coords);
    }
  }
  return [...groups.values()];
}

export const LAND_GROUPS: LandGroup[] = buildLandGroups();

export type Resolved = {country: string; sub: string; zone: string};

const OFFSETS: LonLat[] = [[0, 0]];
for (const r of [0.05, 0.15, 0.3, 0.6, 1, 1.5, 2.5]) {
  for (let a = 0; a < 360; a += 45) {
    OFFSETS.push([r * Math.cos((a * Math.PI) / 180), r * Math.sin((a * Math.PI) / 180)]);
  }
}

const countryAt = (p: LonLat) => COUNTRIES.find((c) => geoContains(c, p));

/**
 * Which country / subregion / zone a coordinate belongs to.
 * Coastal points that fall a bit into the sea (map resolution) are snapped to the nearest land within ~2.5°.
 */
export function resolvePoint(p: LonLat): Resolved | null {
  for (const [dx, dy] of OFFSETS) {
    const q: LonLat = [p[0] + dx, p[1] + dy];
    const country = countryAt(q);
    if (!country) continue;
    const sub = subForCountryPoint(country.properties.name, q);
    if (!sub) return null;
    return {country: country.properties.name, sub, zone: subById(sub)!.zone};
  }
  return null;
}

/** Great-circle distance in km */
export const distanceKm = (a: LonLat, b: LonLat) => geoDistance(a, b) * 6371;
