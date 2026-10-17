import React, {useMemo} from 'react';
import {geoEquirectangular, geoPath} from 'd3-geo';
import {COUNTRIES} from '../../shared/geo/world';
import type {LonLat} from '../../shared/types';

const W = 720;
const H = 360;
const projection = geoEquirectangular().fitExtent(
  [
    [0, 0],
    [W, H],
  ],
  {type: 'Sphere'},
);

type Props = {
  point: LonLat;
  onPick: (p: LonLat) => void;
};

/** Small world map: click anywhere to set the answer's coordinates. */
export const MiniMap: React.FC<Props> = ({point, onPick}) => {
  // ~240 country paths; computed once, the map itself never changes
  const land = useMemo(() => geoPath(projection)({type: 'FeatureCollection', features: COUNTRIES}) ?? '', []);
  const [x, y] = projection(point) ?? [-100, -100];

  const click = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const ll = projection.invert?.([((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]);
    if (ll) onPick([Number(ll[0].toFixed(4)), Number(ll[1].toFixed(4))]);
  };

  return (
    <svg className="minimap" viewBox={`0 0 ${W} ${H}`} onClick={click}>
      <rect width={W} height={H} fill="#12304B" />
      <path d={land} fill="#56677A" stroke="#0B1622" strokeWidth={0.4} />
      <circle cx={x} cy={y} r={6} fill="#FFD23F" stroke="#000" strokeWidth={1.5} />
    </svg>
  );
};
