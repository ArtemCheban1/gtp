import React, {useMemo} from 'react';
import type {Polygon} from 'geojson';
import {geoMercator, geoPath} from 'd3-geo';
import {countryInfo} from '../../shared/geo/countries';
import {outlineShape} from '../../shared/outline';

type Props = {
  country: string;
  width: number;
  height: number;
  /** 0..1 — how much of the outline is drawn */
  progress?: number;
  /** 0..1 — fill opacity */
  fill?: number;
  color: string;
  strokeWidth?: number;
  padding?: number;
};

/**
 * A country's silhouette fitted into a box (its own scale — sizes are NOT comparable between two shapes).
 * Every part is a separate path with pathLength=1, so `progress` draws all parts (islands too) at once.
 */
export const CountryShape: React.FC<Props> = ({country, width, height, progress = 1, fill = 0, color, strokeWidth = 6, padding = 40}) => {
  const rings = useMemo(() => {
    const shape = outlineShape(country);
    const info = countryInfo(country);
    if (!shape || !info) return [];
    const projection = geoMercator()
      .rotate([-info.center[0], 0])
      .fitExtent(
        [
          [padding, padding],
          [width - padding, height - padding],
        ],
        shape,
      );
    const path = geoPath(projection);
    // outer ring of each part only: a hole (San Marino inside Italy…) drawn as its own polygon would be read
    // as "the whole world except this" and fill the box
    return shape.geometry.coordinates.map((poly) => path({type: 'Polygon', coordinates: [poly[0]]} as Polygon) ?? '');
  }, [country, width, height, padding]);

  return (
    <svg width={width} height={height} style={{display: 'block'}}>
      {rings.map((d, i) => (
        <path
          key={i}
          d={d}
          pathLength={1}
          fill={color}
          fillOpacity={fill}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray={1}
          strokeDashoffset={1 - Math.max(0, Math.min(1, progress))}
          style={{filter: `drop-shadow(0 0 10px ${color})`}}
        />
      ))}
    </svg>
  );
};
