import React, {useMemo} from 'react';
import {countryLabel} from '../../shared/geo/countries';
import {SPOT_AREAS, defaultSpot, pickSpotRounds, spotCandidates} from '../../shared/spot';
import type {SpotConfig, SpotRound, VideoProps} from '../../shared/types';

type Props = {
  props: VideoProps;
  update: (patch: Partial<VideoProps>) => void;
};

const SCALES = [1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8];

/** "What's wrong with this map?": one enlarged country per map, picked automatically, editable per round. */
export const SpotEditor: React.FC<Props> = ({props, update}) => {
  const cfg = props.spot ?? defaultSpot(props.seed);
  const set = (patch: Partial<SpotConfig>) => update({spot: {...cfg, ...patch}});
  const setRound = (i: number, patch: Partial<SpotRound>) => set({rounds: cfg.rounds.map((r, j) => (j === i ? {...r, ...patch} : r))});

  const reroll = (count = cfg.rounds.length, seed = props.seed + 1) => update({seed, spot: {...cfg, rounds: pickSpotRounds(seed, count)}});
  const move = (i: number, d: number) => {
    const rounds = [...cfg.rounds];
    [rounds[i], rounds[i + d]] = [rounds[i + d], rounds[i]];
    set({rounds});
  };

  return (
    <section className="card">
      <h2>1 · Maps</h2>
      <p className="hint">
        On each map one country is drawn bigger than it really is. Viewers have to spot it before the timer ends; then it
        shrinks back to its true size. Rounds get harder: big famous countries first, small ones at the end.
      </p>
      <div className="grid4">
        <label className="span2">
          Title
          <input value={cfg.title} onChange={(e) => set({title: e.target.value})} placeholder="What's wrong with this map?" />
        </label>
        <label>
          Maps
          <select value={cfg.rounds.length} onChange={(e) => reroll(Number(e.target.value), props.seed)}>
            {[3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label>
          Seconds: <b>{cfg.seconds} s</b>
          <input type="range" min={4} max={10} value={cfg.seconds} onChange={(e) => set({seconds: Number(e.target.value)})} />
        </label>
      </div>
      <div className="row tight">
        <button className="primary" onClick={() => reroll()}>
          🎲 New maps
        </button>
      </div>
      <ol className="rapid-rounds">
        {cfg.rounds.map((r, i) => (
          <SpotRow
            key={i}
            round={r}
            onChange={(patch) => setRound(i, patch)}
            onUp={i > 0 ? () => move(i, -1) : undefined}
            onDown={i < cfg.rounds.length - 1 ? () => move(i, 1) : undefined}
          />
        ))}
      </ol>
    </section>
  );
};

const SpotRow: React.FC<{round: SpotRound; onChange: (p: Partial<SpotRound>) => void; onUp?: () => void; onDown?: () => void}> = ({
  round,
  onChange,
  onUp,
  onDown,
}) => {
  const choices = useMemo(() => spotCandidates(round.area, round.scale), [round.area, round.scale]);
  const sorted = useMemo(() => [...choices].sort((a, b) => countryLabel(a.name).localeCompare(countryLabel(b.name))), [choices]);
  const valid = choices.some((c) => c.name === round.country);
  return (
    <li>
      <select
        value={round.area}
        onChange={(e) => {
          const next = spotCandidates(e.target.value, round.scale);
          onChange({area: e.target.value, country: next[Math.floor(next.length / 3)]?.name ?? round.country});
        }}
      >
        {SPOT_AREAS.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
      <select className="grow" value={round.country} onChange={(e) => onChange({country: e.target.value})}>
        {valid ? null : <option value={round.country}>{countryLabel(round.country)} (too big at this scale)</option>}
        {sorted.map((c) => (
          <option key={c.name} value={c.name}>
            {countryLabel(c.name)}
          </option>
        ))}
      </select>
      <select value={round.scale} onChange={(e) => onChange({scale: Number(e.target.value)})} title="How much bigger">
        {SCALES.map((k) => (
          <option key={k} value={k}>
            ×{k}
          </option>
        ))}
      </select>
      <button disabled={!onUp} onClick={onUp} title="Earlier">
        ↑
      </button>
      <button disabled={!onDown} onClick={onDown} title="Later">
        ↓
      </button>
    </li>
  );
};
