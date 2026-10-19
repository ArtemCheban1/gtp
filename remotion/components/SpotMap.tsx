import React, {useMemo} from 'react';
import {geoPath} from 'd3-geo';
import {interpolateColors} from 'remotion';
import {type Camera, projectionFor} from '../../shared/geo/camera';
import {COUNTRIES} from '../../shared/geo/world';
import {useTheme} from '../theme';

type Props = {
  camera: Camera;
  width: number;
  height: number;
  /** world-atlas name of the changed country */
  country: string;
  /** lon/lat it is scaled around */
  center: [number, number];
  /** current scale (1 = true size) */
  k: number;
  /** 0 → hidden among the others, 1 → highlighted */
  highlight: number;
  frame: number;
};

/**
 * Map for "What's wrong with this map?". Every country is its own path with its own outline (no shared
 * border mesh), so one country can be drawn bigger without its true outline giving it away. Its true
 * shape is still filled underneath, so a scaled copy that doesn't fully cover it leaves no hole.
 */
export const SpotMap: React.FC<Props> = ({camera, width, height, country, center, k, highlight, frame}) => {
  const {COLORS} = useTheme();
  const projection = useMemo(() => projectionFor(camera, width, height), [camera, width, height]);
  const paths = useMemo(() => {
    const path = geoPath(projection);
    return COUNTRIES.map((c) => ({name: c.properties.name, d: path(c) ?? ''}));
  }, [projection]);
  const target = paths.find((p) => p.name === country);
  const [cx, cy] = projection(center) ?? [width / 2, height / 2];
  const pulse = 0.5 + 0.5 * Math.sin(frame / 4);
  const fill = interpolateColors(highlight, [0, 1], [COLORS.landFocus, COLORS.danger]);
  const stroke = 'rgba(20,30,40,0.55)';

  return (
    <svg width={width} height={height} style={{display: 'block'}}>
      <defs>
        <radialGradient id="spot-ocean" cx="50%" cy="45%" r="75%">
          <stop offset="0%" stopColor={COLORS.ocean} />
          <stop offset="100%" stopColor={COLORS.oceanDeep} />
        </radialGradient>
      </defs>
      <rect width={width} height={height} fill="url(#spot-ocean)" />
      {paths.map((p) =>
        p.name === country ? (
          <path key={p.name} d={p.d} fill={COLORS.landFocus} />
        ) : (
          <path key={p.name} d={p.d} fill={COLORS.landFocus} stroke={stroke} strokeWidth={1.2} strokeLinejoin="round" />
        ),
      )}
      {target ? (
        <g transform={`translate(${cx} ${cy}) scale(${k}) translate(${-cx} ${-cy})`}>
          <path d={target.d} fill={fill} stroke={stroke} strokeWidth={1.2 / k} strokeLinejoin="round" />
          {highlight > 0 ? (
            <path d={target.d} fill="none" stroke="#fff" strokeOpacity={highlight * (0.55 + 0.45 * pulse)} strokeWidth={4 / k} />
          ) : null}
        </g>
      ) : null}
    </svg>
  );
};
