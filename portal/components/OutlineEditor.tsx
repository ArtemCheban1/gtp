import React, {useMemo} from 'react';
import {defaultOutline} from '../../shared/outline';
import {pickRapidCountries, rapidCountryChoices} from '../../shared/rapid';
import type {OutlineConfig, VideoProps} from '../../shared/types';

type Props = {
  props: VideoProps;
  update: (patch: Partial<VideoProps>) => void;
  onNewContent?: () => void;
};

/** "Guess before 100%": the country outline draws itself; viewers name it before it's complete. */
export const OutlineEditor: React.FC<Props> = ({props, update, onNewContent}) => {
  const cfg = props.outline ?? defaultOutline(props.seed);
  const choices = useMemo(rapidCountryChoices, []);
  const set = (patch: Partial<OutlineConfig>) => update({outline: {...cfg, ...patch}});
  const reroll = (patch: Partial<OutlineConfig> = {}, seed = props.seed + 1) => {
    const next = {...cfg, ...patch};
    update({seed, outline: {...next, rounds: pickRapidCountries(seed * 13 + 5, next.rounds.length, next.difficulty).map((country) => ({country}))}});
    onNewContent?.();
  };
  const move = (i: number, d: number) => {
    const rounds = [...cfg.rounds];
    [rounds[i], rounds[i + d]] = [rounds[i + d], rounds[i]];
    set({rounds});
  };

  return (
    <section className="card">
      <h2>1 · Countries</h2>
      <p className="hint">The outline draws itself during the timer (it speeds up at the end). Then it fills in and a small map shows where it is.</p>
      <div className="grid4">
        <label className="span2">
          Title
          <input value={cfg.title} onChange={(e) => set({title: e.target.value})} placeholder="Guess before 100%" />
        </label>
        <label>
          Countries
          <select value={cfg.rounds.length} onChange={(e) => reroll({rounds: Array.from({length: Number(e.target.value)}, () => ({country: ''}))}, props.seed)}>
            {[3, 4, 5, 6, 7, 8, 10].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label>
          Difficulty
          <select value={cfg.difficulty} onChange={(e) => reroll({difficulty: e.target.value as OutlineConfig['difficulty']}, props.seed)}>
            <option value="mixed">Easy → hard</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
      </div>
      <label>
        Drawing time: <b>{cfg.seconds} s</b>
        <input type="range" min={3} max={8} value={cfg.seconds} onChange={(e) => set({seconds: Number(e.target.value)})} />
      </label>
      <div className="row tight">
        <button className="primary" onClick={() => reroll()}>
          🎲 New countries
        </button>
      </div>
      <ol className="rapid-rounds">
        {cfg.rounds.map((r, i) => (
          <li key={i}>
            <select className="grow" value={r.country} onChange={(e) => set({rounds: cfg.rounds.map((x, j) => (j === i ? {country: e.target.value} : x))})}>
              {choices.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.label}
                </option>
              ))}
            </select>
            <button disabled={i === 0} onClick={() => move(i, -1)} title="Earlier">
              ↑
            </button>
            <button disabled={i === cfg.rounds.length - 1} onClick={() => move(i, 1)} title="Later">
              ↓
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
};
