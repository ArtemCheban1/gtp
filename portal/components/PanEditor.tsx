import React from 'react';
import type {PanConfig, VideoProps} from '../../shared/types';

export const DEFAULT_PAN: PanConfig = {seconds: 8, question: 'Do you know this city?', reveal: true};

/** City pan format: one photo, slow pan, question on top, answer at the very end (optional). */
export const PanEditor: React.FC<{props: VideoProps; update: (patch: Partial<VideoProps>) => void}> = ({props, update}) => {
  const pan = props.pan ?? DEFAULT_PAN;
  const set = (patch: Partial<PanConfig>) => update({pan: {...pan, ...patch}});
  return (
    <section className="card">
      <h2>3 · City pan</h2>
      <div className="grid2">
        <label>
          Question
          <input value={pan.question} onChange={(e) => set({question: e.target.value})} />
        </label>
        <label>
          Length: <b>{pan.seconds} s</b>
          <input type="range" min={5} max={15} value={pan.seconds} onChange={(e) => set({seconds: Number(e.target.value)})} />
        </label>
      </div>
      <label className="check">
        <input type="checkbox" checked={pan.reveal} onChange={(e) => set({reveal: e.target.checked})} /> Show the answer for the last
        1.5 s (off = answer only in the caption — more guesses in the comments)
      </label>
      <p className="hint">The photo's "hint text" appears halfway through. Short pans loop well — 6–9 s is a good length.</p>
    </section>
  );
};
