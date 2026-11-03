import React, {useMemo} from 'react';
import {QUESTIONS, defaultVersus, pickVersusRounds, versusAnswer, versusChoices, versusPlan} from '../../shared/versus';
import type {VersusConfig, VersusQuestion, VersusRound, VideoProps} from '../../shared/types';

type Props = {
  props: VideoProps;
  update: (patch: Partial<VideoProps>) => void;
  onNewContent?: () => void;
};

/** "Which is bigger?" / "Which is farther north?": two countries per round, auto-picked to be tricky. */
export const VersusEditor: React.FC<Props> = ({props, update, onNewContent}) => {
  const cfg = props.versus ?? defaultVersus(props.seed);
  const choices = useMemo(versusChoices, []);
  const plan = useMemo(() => versusPlan(props), [props]);
  const set = (patch: Partial<VersusConfig>) => update({versus: {...cfg, ...patch}});
  const setRound = (i: number, patch: Partial<VersusRound>) => set({rounds: cfg.rounds.map((r, j) => (j === i ? {...r, ...patch} : r))});
  const reroll = (count = cfg.rounds.length, seed = props.seed + 1) => {
    update({seed, versus: {...cfg, rounds: pickVersusRounds(seed, count)}});
    onNewContent?.();
  };

  const countrySelect = (value: string, onChange: (v: string) => void) => (
    <select className="grow" value={value} onChange={(e) => onChange(e.target.value)}>
      {choices.map((c) => (
        <option key={c.name} value={c.name}>
          {c.label}
        </option>
      ))}
    </select>
  );

  return (
    <section className="card">
      <h2>1 · Match-ups</h2>
      <p className="hint">
        Pairs are picked to fool people: for “bigger”, the smaller country is the one nearer a pole (it looks bigger on
        normal maps); for “farther north”, two countries on different continents a few degrees apart.
      </p>
      <div className="grid4">
        <label className="span2">
          Title (cover &amp; caption)
          <input value={cfg.title} onChange={(e) => set({title: e.target.value})} placeholder="Which is bigger?" />
        </label>
        <label>
          Rounds
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
          <input type="range" min={3} max={8} value={cfg.seconds} onChange={(e) => set({seconds: Number(e.target.value)})} />
        </label>
      </div>
      <div className="row tight">
        <button className="primary" onClick={() => reroll()}>
          🎲 New match-ups
        </button>
      </div>
      <ol className="rapid-rounds">
        {cfg.rounds.map((r, i) => (
          <li key={i} title={plan[i] ? versusAnswer(plan[i]) : ''}>
            <select value={r.question} onChange={(e) => setRound(i, {question: e.target.value as VersusQuestion})}>
              {(Object.keys(QUESTIONS) as VersusQuestion[]).map((q) => (
                <option key={q} value={q}>
                  {QUESTIONS[q].short}
                </option>
              ))}
            </select>
            {countrySelect(r.a, (a) => setRound(i, {a}))}
            <small>vs</small>
            {countrySelect(r.b, (b) => setRound(i, {b}))}
            <button onClick={() => setRound(i, {a: r.b, b: r.a})} title="Swap top/bottom">
              ⇅
            </button>
          </li>
        ))}
      </ol>
      <p className="hint">Answers: {plan.map((p, i) => `${i + 1}. ${versusAnswer(p)}`).join(' · ')}</p>
    </section>
  );
};
