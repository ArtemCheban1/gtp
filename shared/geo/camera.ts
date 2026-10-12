import {geoMercator, type GeoProjection} from 'd3-geo';
import type {BBox} from '../types';
import {unwrappedEast} from './bbox';

/**
 * Map "camera" in rotated Mercator: centre longitude/latitude + scale.
 * Mercator keeps meridians vertical, which lets us clip split countries with a plain rectangle.
 */
export type Camera = {lon: number; lat: number; scale: number};

const RAD = Math.PI / 180;
const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * RAD) / 2));
const invMercY = (y: number) => (2 * Math.atan(Math.exp(y)) - Math.PI / 2) / RAD;
const wrap = (lon: number) => ((((lon + 180) % 360) + 360) % 360) - 180;

export function cameraForBox(b: BBox, width: number, height: number, padding = 0.88): Camera {
  const e = unwrappedEast(b);
  const y1 = mercY(b[1]);
  const y2 = mercY(b[3]);
  const scale = Math.min(width / ((e - b[0]) * RAD), height / (y2 - y1)) * padding;
  return {lon: wrap((b[0] + e) / 2), lat: invMercY((y1 + y2) / 2), scale};
}

/** Smooth fly between cameras: shortest way round in longitude, Mercator-linear in latitude, log in scale. */
export function lerpCamera(a: Camera, b: Camera, t: number): Camera {
  let dLon = b.lon - a.lon;
  if (dLon > 180) dLon -= 360;
  if (dLon < -180) dLon += 360;
  const y = mercY(a.lat) + (mercY(b.lat) - mercY(a.lat)) * t;
  return {
    lon: wrap(a.lon + dLon * t),
    lat: invMercY(y),
    scale: Math.exp(Math.log(a.scale) + (Math.log(b.scale) - Math.log(a.scale)) * t),
  };
}

export function projectionFor(cam: Camera, width: number, height: number): GeoProjection {
  return geoMercator()
    .rotate([-cam.lon, 0])
    .center([0, cam.lat])
    .scale(cam.scale)
    .translate([width / 2, height / 2])
    .clipExtent([
      [-20, -20],
      [width + 20, height + 20],
    ]);
}
