import React, {useEffect, useState} from 'react';
import type {PhotoSlot, Place} from '../../shared/types';
import {importPhoto, photoSources, searchPhotos, type FoundPhoto, type PhotoSource} from '../api';

type Props = {
  place: Place;
  /** Buttons under each photo (default: rounds 1–3); clicking one calls onUse with its index */
  targets?: {label: string; title: string}[];
  /** Puts a downloaded photo into target i */
  onUse: (i: number, slot: PhotoSlot) => void;
};

const ROUND_TARGETS = [0, 1, 2].map((i) => ({label: String(i + 1), title: `Use for round ${i + 1}`}));

const NAMES: Record<PhotoSource, string> = {
  wikimedia: 'Wikimedia Commons',
  openverse: 'Openverse (Flickr & more)',
  mapillary: 'Mapillary (street view)',
  pexels: 'Pexels',
  pixabay: 'Pixabay',
};
const ORDER: PhotoSource[] = ['wikimedia', 'openverse', 'mapillary', 'pexels', 'pixabay'];

/** Searches free-licence photos around the answer; one click downloads a photo into a slot with its credit. */
export const PhotoFinder: React.FC<Props> = ({place, targets = ROUND_TARGETS, onUse}) => {
  const [sources, setSources] = useState<Record<PhotoSource, boolean>>({
    wikimedia: true,
    openverse: true,
    mapillary: false,
    pexels: false,
    pixabay: false,
  });
  // Search words; empty = the place name. Reset when another place is picked.
  const [query, setQuery] = useState('');
  useEffect(() => setQuery(''), [place.name]);
  const words = query.trim() || place.name;
  const ownWords = !!query.trim() && query.trim() !== place.name;
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
      setPhotos(await searchPhotos(s, place.lat, place.lon, words, !ownWords));
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

  const enabled = ORDER.filter((s) => sources[s]);

  return (
    <section className="card">
      <h2>Find photos</h2>
      <p className="hint">
        Free-licence photos (commercial use allowed). Pick one with the buttons under it — the author and licence go into the caption
        automatically. Check the licence page if unsure.
        {enabled.length < ORDER.length ? ' Mapillary, Pexels and Pixabay need a free key in .env (see server/photos.ts).' : ''}
      </p>
      <div className="row">
        <input
          className="grow"
          placeholder={`Search words — default: ${place.name} (e.g. "Eiffel Tower", "Montmartre street")`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !busy && search()}
        />
      </div>
      <p className="hint">
        {ownWords
          ? `Searching for “${words}” (text search; Mapillary still uses the coordinates).`
          : `Searching around ${place.name}'s coordinates and for its name.`}
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
                {targets.map((t, i) => (
                  <button key={i} disabled={!!importing} onClick={() => use(p, i)} title={t.title}>
                    {importing === `${p.id}-${i}` ? '…' : t.label}
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
