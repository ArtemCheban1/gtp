import React from 'react';
import {canBeOption} from '../../shared/geo/regions';
import {citiesInSub, type Plan} from '../../shared/rounds';
import type {VideoProps} from '../../shared/types';

type Props = {
  props: VideoProps;
  plan: Plan;
  update: (patch: Partial<VideoProps>) => void;
};

/** Round-3 wrong answers: auto-picked from the city list, each one can be swapped by hand. */
export const DecoyEditor: React.FC<Props> = ({props, plan, update}) => {
  const countries = props.round3 === 'countries';
  const modeSelect = (
    <label>
      Round 3 asks for{' '}
      <select value={props.round3 ?? 'cities'} onChange={(e) => update({round3: e.target.value as VideoProps['round3']})}>
        <option value="cities">the exact place (4 cities)</option>
        <option value="countries">the country (4 countries)</option>
      </select>
    </label>
  );
  if ('error' in plan) {
    return countries ? (
      <section className="card">
        <h2>3 · Round 3 options</h2>
        {modeSelect}
      </section>
    ) : null;
  }
  if (countries) {
    return (
      <section className="card">
        <h2>3 · Round 3 options</h2>
        {modeSelect}
        <p className="hint">The answer's country plus 3 nearby countries, picked automatically.</p>
        <div className="row">
          <button onClick={() => update({seed: props.seed + 1})}>Shuffle options</button>
          <span className="hint">
            Order:{' '}
            {plan.rounds[2].options.map((o) => (
              <b key={o.letter} className={o.correct ? 'ok' : ''}>
                {o.letter} {o.label}{' '}
              </b>
            ))}
          </span>
        </div>
      </section>
    );
  }
  const pool = citiesInSub(plan.subId).filter((c) => c.name !== props.place.name && canBeOption(c.country));
  const current = plan.decoys;

  const setDecoy = (i: number, name: string) => {
    const next = [...current];
    next[i] = pool.find((c) => c.name === name)!;
    update({decoys: next});
  };

  return (
    <section className="card">
      <h2>3 · Round 3 options</h2>
      {modeSelect}
      <p className="hint">The right answer plus 3 other places in the same region. Letter order is shuffled.</p>
      <div className="row">
        {current.map((d, i) => (
          <select key={i} className="grow" value={d.name} onChange={(e) => setDecoy(i, e.target.value)}>
            {pool.map((c) => (
              <option key={c.name} value={c.name} disabled={c.name !== d.name && current.some((x) => x.name === c.name)}>
                {c.name}
              </option>
            ))}
          </select>
        ))}
      </div>
      <div className="row">
        <button onClick={() => update({decoys: [], seed: props.seed + 1})}>Shuffle options</button>
        <span className="hint">
          Order:{' '}
          {plan.rounds[2].options.map((o) => (
            <b key={o.letter} className={o.correct ? 'ok' : ''}>
              {o.letter} {o.label}{' '}
            </b>
          ))}
        </span>
      </div>
    </section>
  );
};
