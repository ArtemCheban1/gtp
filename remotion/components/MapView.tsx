import React, {useMemo} from 'react';
import {geoPath} from 'd3-geo';
import {interpolateColors} from 'remotion';
import {type Camera, projectionFor} from '../../shared/geo/camera';
import {SUBREGIONS, ZONES} from '../../shared/geo/regions';
import {BORDERS, LAND_GROUPS} from '../../shared/geo/world';
import type {MapOption, RoundSpec} from '../../shared/types';
import {fontFamily, useTheme} from '../theme';

type Props = {
  camera: Camera;
  width: number;
  height: number;
  round: RoundSpec;
  /** 0 → question, 1 → answer fully revealed */
  reveal: number;
  /** frame counter for pulsing effects */
  frame: number;
  /** hide option badges (used while the camera is flying in) */
  labelsOpacity?: number;
};

const ZONE_LETTER = new Map(ZONES.map((z) => [z.id, z.letter]));
const SUB_LETTER = new Map(SUBREGIONS.map((s) => [s.id, s.letter]));
const LABEL_AT = new Map<string, [number, number]>([
  ...ZONES.map((z) => [z.id, z.labelAt] as const),
  ...SUBREGIONS.map((s) => [s.id, s.labelAt] as const),
]);

export const MapView: React.FC<Props> = ({camera, width, height, round, reveal, frame, labelsOpacity = 1}) => {
  const {COLORS, OPTION_COLORS} = useTheme();
  const projection = useMemo(() => projectionFor(camera, width, height), [camera, width, height]);
  const path = useMemo(() => geoPath(projection), [projection]);

  const land = useMemo(
    () =>
      LAND_GROUPS.map((g) => ({
        g,
        d: path(g.geometry) ?? '',
        clipX: g.lonRange ? projection([g.lonRange[0] === -180 ? g.lonRange[1] : g.lonRange[0], 0])![0] : null,
      })),
    [path, projection],
  );
  const borders = useMemo(() => path(BORDERS) ?? '', [path]);

  const correct = round.options.find((o) => o.correct)!;

  /** Fill colour of one land group for this round */
  const fillFor = (sub: string, zone: string): string => {
    if (round.kind === 'zones') {
      const letter = ZONE_LETTER.get(zone)!;
      const base = OPTION_COLORS[letter];
      return zone === correct.regionId ? base : interpolateColors(reveal, [0, 1], [base, COLORS.land]);
    }
    if (round.kind === 'subregions') {
      if (zone !== round.focusId) return COLORS.land;
      const base = OPTION_COLORS[SUB_LETTER.get(sub)!];
      return sub === correct.regionId ? base : interpolateColors(reveal, [0, 1], [base, COLORS.land]);
    }
    return sub === round.focusId ? COLORS.landFocus : COLORS.land;
  };

  const pulse = 0.5 + 0.5 * Math.sin(frame / 4);

  return (
    <svg width={width} height={height} style={{display: 'block'}}>
      <defs>
        <radialGradient id="ocean" cx="50%" cy="45%" r="75%">
          <stop offset="0%" stopColor={COLORS.ocean} />
          <stop offset="100%" stopColor={COLORS.oceanDeep} />
        </radialGradient>
        {land.map(({g, clipX}, i) =>
          clipX === null ? null : (
            <clipPath id={`split-${i}`} key={i}>
              {g.lonRange![0] === -180 ? (
                <rect x={-10000} y={-10000} width={10000 + clipX} height={30000} />
              ) : (
                <rect x={clipX} y={-10000} width={20000} height={30000} />
              )}
            </clipPath>
          ),
        )}
      </defs>
      <rect width={width} height={height} fill="url(#ocean)" />

      {land.map(({g, d, clipX}, i) => (
        <path
          key={i}
          d={d}
          fill={fillFor(g.sub, g.zone)}
          stroke="rgba(255,255,255,0.35)"
          strokeWidth={0.8}
          clipPath={clipX === null ? undefined : `url(#split-${i})`}
        />
      ))}
      <path d={borders} fill="none" stroke={COLORS.border} strokeWidth={1} />

      {/* Glow outline around the correct region once revealed */}
      {round.kind !== 'points' && reveal > 0
        ? land
            .filter(({g}) => (round.kind === 'zones' ? g.zone : g.sub) === correct.regionId)
            .map(({g, d, clipX}) => (
              <path
                key={`glow-${g.sub}-${clipX}`}
                d={d}
                fill="none"
                stroke="#FFFFFF"
                strokeOpacity={reveal * (0.6 + 0.4 * pulse)}
                strokeWidth={3}
                clipPath={clipX === null ? undefined : `url(#split-${land.findIndex((l) => l.g === g)})`}
              />
            ))
        : null}

      <g opacity={labelsOpacity}>
        {layoutLabels(
          round.options.map((o) => projection(o.point ?? LABEL_AT.get(o.regionId!)!)!),
          round.options.map((o) => o.label),
          round.kind,
          width,
          height,
        ).map((l, i) => (
          <OptionMarker
            key={round.options[i].letter}
            option={round.options[i]}
            layout={l}
            reveal={reveal}
            pulse={pulse}
            kind={round.kind}
          />
        ))}
      </g>
    </svg>
  );
};

type LabelLayout = {
  xy: [number, number];
  /** badge centre relative to xy */
  badge: [number, number];
  r: number;
  fontSize: number;
  pill: {x: number; y: number; w: number; h: number};
};

type Rect = {x: number; y: number; w: number; h: number};
const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/**
 * Places each badge + name pill, moving a pill above / beside its badge when it would
 * collide with one placed earlier or stick out of the map.
 */
function layoutLabels(
  points: [number, number][],
  labels: string[],
  kind: RoundSpec['kind'],
  width: number,
  height: number,
): LabelLayout[] {
  const isPoint = kind === 'points';
  const r = isPoint ? 26 : 30;
  const fontSize = kind === 'zones' ? 26 : 24;
  const h = fontSize + 20;
  const badge: [number, number] = isPoint ? [0, -r - 14] : [0, 0];
  const placed: Rect[] = points.map(([x, y]) => ({x: x + badge[0] - r, y: y + badge[1] - r, w: 2 * r, h: 2 * r}));
  // the countdown ring overlaps the top-centre of the map
  placed.push({x: width / 2 - 95, y: 0, w: 190, h: 80});

  return points.map((xy, i) => {
    const w = Math.min(labels[i].length * fontSize * 0.62 + 36, width - 40);
    const by = badge[1];
    const candidates: [number, number][] = [
      [-w / 2, by + r + 8], // below
      [-w / 2, by - r - 8 - h], // above
      [r + 10, by - h / 2], // right
      [-r - 10 - w, by - h / 2], // left
      [-w / 2, by + r + 14 + h], // further below
      [-w / 2, by - r - 14 - 2 * h], // further above
    ];
    const fits = ([dx, dy]: [number, number]) => {
      const rect = {x: xy[0] + dx, y: xy[1] + dy, w, h};
      const inside = rect.x >= 10 && rect.x + w <= width - 10 && rect.y >= 10 && rect.y + h <= height - 10;
      return inside && !placed.some((p) => overlaps(p, rect));
    };
    let [dx, dy] = candidates.find(fits) ?? candidates[0];
    // clamp horizontally so the pill never leaves the map
    dx = Math.max(10 - xy[0], Math.min(width - 10 - xy[0] - w, dx));
    const pill = {x: dx, y: dy, w, h};
    placed.push({x: xy[0] + dx, y: xy[1] + dy, w, h});
    return {xy, badge, r, fontSize, pill};
  });
}

const OptionMarker: React.FC<{
  option: MapOption;
  layout: LabelLayout;
  reveal: number;
  pulse: number;
  kind: RoundSpec['kind'];
}> = ({option, layout, reveal, pulse, kind}) => {
  const {COLORS, OPTION_COLORS} = useTheme();
  const {xy, badge, r, fontSize, pill} = layout;
  const color = OPTION_COLORS[option.letter];
  const isPoint = kind === 'points';
  const fade = option.correct ? 1 : 1 - reveal * 0.75;
  const grow = option.correct ? 1 + reveal * 0.15 : 1;

  return (
    <g transform={`translate(${xy[0]}, ${xy[1]}) scale(${grow})`} opacity={fade} style={{fontFamily}}>
      {isPoint && option.correct && reveal > 0 ? (
        <circle r={r + 14 + pulse * 22} fill="none" stroke={COLORS.correct} strokeWidth={5} opacity={reveal * (1 - pulse * 0.6)} />
      ) : null}
      {isPoint ? <circle r={8} fill="#fff" stroke="#000" strokeOpacity={0.4} strokeWidth={2} /> : null}
      <g transform={`translate(${badge[0]}, ${badge[1]})`}>
        <circle r={r} fill={option.correct && reveal > 0.5 ? COLORS.correct : color} stroke="#fff" strokeWidth={4} />
        {option.correct && reveal > 0.5 ? (
          <path
            d={`M ${-r * 0.42} ${r * 0.02} L ${-r * 0.1} ${r * 0.34} L ${r * 0.45} ${-r * 0.3}`}
            fill="none"
            stroke="#fff"
            strokeWidth={r * 0.22}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <text textAnchor="middle" dy="0.36em" fontSize={r * 1.15} fontWeight={900} fill="#fff">
            {option.letter}
          </text>
        )}
      </g>
      <g transform={`translate(${pill.x}, ${pill.y})`}>
        <rect width={pill.w} height={pill.h} rx={pill.h / 2} fill="rgba(8,16,26,0.82)" />
        <text x={pill.w / 2} y={pill.h / 2} dy="0.35em" textAnchor="middle" fontSize={fontSize} fontWeight={800} fill="#fff">
          {option.label}
        </text>
      </g>
    </g>
  );
};
