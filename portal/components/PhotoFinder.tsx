import React, {useEffect, useState} from 'react';
import type {PhotoSlot, Place} from '../../shared/types';
import {importPhoto, photoSources, searchPhotos, type FoundPhoto, type PhotoSource} from '../api';

type Props = {
  place: Place;
  /** Puts a downloaded photo into slot i */
  onUse: (i: number, slot: PhotoSlot) => void;
};

const NAMES: Record<PhotoSource, string> = {
  wikimedia: 'Wikimedia Commons',
  mapillary: 'Mapillary (street view)',
  pexels: 'Pexels',
};

/** Searches free-licence photos around the answer; one click downloads a photo into a slot with its credit. */
export const PhotoFinder: React.FC<Props> = ({place, onUse}) => {
  const [sources, setSources] = useState<Record<PhotoSource, boolean>>({wikimedia: true, mapillary: false, pexels: false});
  const [source, setSource] = useState<PhotoSource>('wikimedia');
  const [photos, setPhotos] = useState<FoundPhoto[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    photoSources().then(setSources).catch(() => undefined);
  }, []);

  const search = async (s = source) => {
    setSource(s);
    setBusy(true);
    setError('');
    try {
      setPhotos(await searchPhotos(s, place.lat, place.lon, place.name));
    } catch (e) {
      setError((e as Error).message);
      setPhotos(null);
    } finally {
      setBusy(false);
    }
  };

  const use = async (p: FoundPhoto, i: number) => {
    setImporting(`${p.id}-${i}`);
    setError('');
    try {
      const {url} = await importPhoto(p.full);
      onUse(i, {src: url, credit: p.credit, sourceUrl: p.page});
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setImporting(null);
    }
  };

  const enabled = (Object.keys(sources) as PhotoSource[]).filter((s) => sources[s]);

  return (
    <section className="card">
      <h2>Find photos</h2>
      <p className="hint">
        Free-licence photos around <b>{place.name}</b> (commercial use allowed). Pick one for round 1, 2 or 3 — the author and
        licence go into the caption automatically. Check the licence page if unsure.
        {enabled.length < 3 ? ' Mapillary and Pexels need a free key in .env (see server/photos.ts).' : ''}
      </p>
      <div className="row tight">
        {enabled.map((s) => (
          <button key={s} className={photos && source === s ? 'primary' : ''} onClick={() => search(s)} disabled={busy}>
            {busy && source === s ? 'Searching…' : NAMES[s]}
          </button>
        ))}
      </div>
      {error ? <p className="error">{error}</p> : null}
      {photos && !photos.length ? <p className="hint">Nothing found here — try another source or a bigger city nearby.</p> : null}
      {photos?.length ? (
        <div className="finder-grid">
          {photos.map((p) => (
            <figure key={p.id}>
              <a href={p.page} target="_blank" rel="noreferrer" title="Open the licence page">
                <img src={p.thumb} alt="" loading="lazy" />
              </a>
              <figcaption title={p.credit}>{p.credit}</figcaption>
              <div className="row tight">
                {[0, 1, 2].map((i) => (
                  <button key={i} disabled={!!importing} onClick={() => use(p, i)} title={`Use for round ${i + 1}`}>
                    {importing === `${p.id}-${i}` ? '…' : i + 1}
                  </button>
                ))}
              </div>
            </figure>
          ))}
        </div>
      ) : null}
    </section>
  );
};
