import React, {useState} from 'react';
import type {PhotoSlot, VideoProps} from '../../shared/types';
import {uploadFile} from '../api';

type Photos = VideoProps['photos'];
type Props = {
  photos: Photos;
  /** Functional update: several uploads can finish at the same time. */
  onChange: (update: (photos: Photos) => Photos) => void;
};

const TIPS = ['Hardest: few clues', 'Medium: narrows it down', 'Easiest: almost gives it away'];

export const PhotoSlots: React.FC<Props> = ({photos, onChange}) => {
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState('');

  const set = (i: number, patch: Partial<PhotoSlot>) =>
    onChange((prev) => prev.map((p, j) => (j === i ? {...p, ...patch} : p)) as Photos);

  const swap = (i: number, j: number) =>
    onChange((prev) => {
      const next = [...prev] as Photos;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const upload = async (i: number, file?: File) => {
    if (!file) return;
    setBusy(i);
    setError('');
    try {
      set(i, {src: await uploadFile(file), focus: undefined, credit: undefined, sourceUrl: undefined});
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="card">
      <h2>2 · Photos</h2>
      <p className="hint">One photo per round. Go from vague to obvious. Drop a file on a slot or click it.</p>
      <div className="photos">
        {photos.map((p, i) => (
          <div key={i} className="photo-slot">
            <label
              className={`drop ${busy === i ? 'busy' : ''}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                upload(i, e.dataTransfer.files[0]);
              }}
              onClick={(e) => {
                // With a photo loaded, a click picks the focus point instead of opening the file dialog.
                if (!p.src) return;
                e.preventDefault();
                const r = e.currentTarget.getBoundingClientRect();
                const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
                const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
                set(i, {focus: {x: +x.toFixed(3), y: +y.toFixed(3)}});
              }}
            >
              {p.src ? (
                <>
                  <img
                    src={p.src}
                    alt=""
                    style={{objectPosition: `${(p.focus?.x ?? 0.5) * 100}% ${(p.focus?.y ?? 0.5) * 100}%`}}
                  />
                  <i
                    className="focus-dot"
                    style={{left: `${(p.focus?.x ?? 0.5) * 100}%`, top: `${(p.focus?.y ?? 0.5) * 100}%`}}
                  />
                </>
              ) : (
                <span>{busy === i ? 'Uploading…' : `Round ${i + 1}`}</span>
              )}
              <input type="file" accept="image/*" hidden onChange={(e) => upload(i, e.target.files?.[0])} />
            </label>
            <small>{TIPS[i]}{p.src ? ' · click photo to set focus' : ''}</small>
            <input placeholder="Optional hint text" value={p.caption ?? ''} onChange={(e) => set(i, {caption: e.target.value})} />
            <input
              placeholder="Credit (author, licence) — goes into the caption"
              title={p.sourceUrl}
              value={p.credit ?? ''}
              onChange={(e) => set(i, {credit: e.target.value || undefined})}
            />
            <div className="row tight">
              <button disabled={i === 0} onClick={() => swap(i, i - 1)} title="Move earlier">
                ←
              </button>
              <button disabled={!p.src} onClick={() => set(i, {src: '', focus: undefined, credit: undefined, sourceUrl: undefined})}>
                Remove
              </button>
              <button disabled={i === 2} onClick={() => swap(i, i + 1)} title="Move later">
                →
              </button>
            </div>
          </div>
        ))}
      </div>
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
};
