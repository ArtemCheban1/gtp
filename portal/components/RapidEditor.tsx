import React, {useMemo, useState} from 'react';
import {defaultRapid, pickRapidCountries, rapidCountryChoices} from '../../shared/rapid';
import type {PhotoSlot, RapidConfig, RapidRound, VideoProps} from '../../shared/types';
import {uploadFile} from '../api';

type Props = {
  props: VideoProps;
  update: (patch: Partial<VideoProps>) => void;
};

/** Rapid format: 5–10 quick rounds. Countries are picked automatically; any round can become a photo. */
export const RapidEditor: React.FC<Props> = ({props, update}) => {
  const cfg = props.rapid ?? defaultRapid(props.seed);
  const choices = useMemo(rapidCountryChoices, []);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState('');

  const set = (patch: Partial<RapidConfig>) => update({rapid: {...cfg, ...patch}});
  const setRound = (i: number, r: RapidRound) => set({rounds: cfg.rounds.map((x, j) => (j === i ? r : x))});

  /** New countries for every country round (photo rounds stay), using the next seed. */
  const reroll = (patch: Partial<RapidConfig> = {}, seed = props.seed + 1) => {
    const next = {...cfg, ...patch};
    const picks = pickRapidCountries(seed, next.rounds.length, next.difficulty);
    const rounds = next.rounds.map((r, i): RapidRound => (r.kind === 'country' ? {kind: 'country', country: picks[i] ?? r.country} : r));
    update({seed, rapid: {...next, rounds}});
  };

  const setCount = (n: number) => {
    if (n < cfg.rounds.length) return set({rounds: cfg.rounds.slice(0, n)});
    const used = new Set(cfg.rounds.flatMap((r) => (r.kind === 'country' ? [r.country] : [])));
    const extra = pickRapidCountries(props.seed + 7, 20, cfg.difficulty).filter((c) => !used.has(c));
    set({rounds: [...cfg.rounds, ...extra.slice(0, n - cfg.rounds.length).map((country): RapidRound => ({kind: 'country', country}))]});
  };

  const move = (i: number, d: number) => {
    const rounds = [...cfg.rounds];
    [rounds[i], rounds[i + d]] = [rounds[i + d], rounds[i]];
    set({rounds});
  };

  const upload = async (i: number, file: File | undefined, r: Extract<RapidRound, {kind: 'photo'}>) => {
    if (!file) return;
    setBusy(i);
    setError('');
    try {
      setRound(i, {...r, src: await uploadFile(file), focus: undefined, credit: undefined, sourceUrl: undefined});
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="card">
      <h2>1 · Rapid rounds</h2>
      <p className="hint">
        A country is highlighted on the map — viewers name it before the timer runs out. Switch any round to a photo
        (e.g. a landmark) with 📷.
      </p>
      <div className="grid4">
        <label className="span2">
          Title
          <input value={cfg.title} onChange={(e) => set({title: e.target.value})} placeholder="Guess the Country" />
        </label>
        <label>
          Rounds
          <select value={cfg.rounds.length} onChange={(e) => setCount(Number(e.target.value))}>
            {[5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label>
          Difficulty
          <select value={cfg.difficulty} onChange={(e) => reroll({difficulty: e.target.value as RapidConfig['difficulty']}, props.seed)}>
            <option value="mixed">Easy → hard</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
      </div>
      <label>
        Seconds per round: <b>{cfg.seconds} s</b>
        <input type="range" min={2} max={6} value={cfg.seconds} onChange={(e) => set({seconds: Number(e.target.value)})} />
      </label>
      <div className="row tight">
        <button className="primary" onClick={() => reroll()}>
          🎲 New countries
        </button>
      </div>

      <ol className="rapid-rounds">
        {cfg.rounds.map((r, i) => (
          <li key={i}>
            {r.kind === 'country' ? (
              <select className="grow" value={r.country} onChange={(e) => setRound(i, {kind: 'country', country: e.target.value})}>
                {choices.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.label}
                  </option>
                ))}
              </select>
            ) : (
              <>
                <label className={`thumb ${busy === i ? 'busy' : ''}`} title="Upload a photo">
                  {r.src ? <img src={r.src} alt="" /> : <span>{busy === i ? '…' : '+'}</span>}
                  <input type="file" accept="image/*" hidden onChange={(e) => upload(i, e.target.files?.[0], r)} />
                </label>
                <input className="grow" placeholder="Answer, e.g. Eiffel Tower" value={r.answer} onChange={(e) => setRound(i, {...r, answer: e.target.value})} />
              </>
            )}
            <button
              title={r.kind === 'country' ? 'Use a photo for this round' : 'Back to a country on the map'}
              onClick={() =>
                setRound(
                  i,
                  r.kind === 'country'
                    ? {kind: 'photo', answer: '', src: ''}
                    : {kind: 'country', country: pickRapidCountries(props.seed + i, 1, cfg.difficulty)[0]},
                )
              }
            >
              {r.kind === 'country' ? '📷' : '🗺️'}
            </button>
            <button disabled={i === 0} onClick={() => move(i, -1)} title="Earlier">
              ↑
            </button>
            <button disabled={i === cfg.rounds.length - 1} onClick={() => move(i, 1)} title="Later">
              ↓
            </button>
          </li>
        ))}
      </ol>
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
};

/** Photo rounds of a rapid config, for the photo finder's buttons. */
export const rapidPhotoTargets = (cfg: RapidConfig | undefined) =>
  (cfg?.rounds ?? []).flatMap((r, i) => (r.kind === 'photo' ? [{index: i, label: `R${i + 1}`, title: `Use for rapid round ${i + 1}`}] : []));

/** Puts a found photo into rapid round `index`, keeping its answer. */
export function withRapidPhoto(props: VideoProps, index: number, slot: PhotoSlot): VideoProps {
  const cfg = props.rapid;
  if (!cfg) return props;
  return {
    ...props,
    rapid: {
      ...cfg,
      rounds: cfg.rounds.map((r, i) => (i === index && r.kind === 'photo' ? {...r, ...slot, focus: undefined} : r)),
    },
  };
}
