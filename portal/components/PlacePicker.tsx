import React, {useMemo, useState} from 'react';
import {CITIES} from '../../shared/geo/cities';
import {SUBREGIONS, ZONES, subById, zoneById} from '../../shared/geo/regions';
import type {Plan} from '../../shared/rounds';
import type {Place, VideoProps} from '../../shared/types';
import {geocode, type GeoResult} from '../api';

type Props = {
  props: VideoProps;
  plan: Plan;
  update: (patch: Partial<VideoProps>) => void;
};

const norm = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

export const PlacePicker: React.FC<Props> = ({props, plan, update}) => {
  const [query, setQuery] = useState('');
  const [web, setWeb] = useState<GeoResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const place = props.place;

  const local = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return [];
    return CITIES.filter((c) => norm(`${c.name} ${c.country}`).includes(q)).slice(0, 8);
  }, [query]);

  const choose = (p: Place) => {
    // a new answer → forget the manual region and old decoys
    update({place: {name: p.name, country: p.country, lat: p.lat, lon: p.lon}, decoys: []});
    setQuery('');
    setWeb([]);
  };

  const searchWeb = async () => {
    setBusy(true);
    setError('');
    try {
      setWeb(await geocode(query));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const setPlace = (patch: Partial<Place>) => update({place: {...place, ...patch}});
  const detected = 'error' in plan ? null : {zone: zoneById(plan.zoneId)!, sub: subById(plan.subId)!};

  return (
    <section className="card">
      <h2>1 · The answer</h2>
      <div className="row">
        <input
          className="grow"
          placeholder="Search a city or landmark… (e.g. Sydney, Eiffel Tower)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && query && searchWeb()}
        />
        <button onClick={searchWeb} disabled={!query || busy}>
          {busy ? 'Searching…' : 'Search online'}
        </button>
      </div>
      {error ? <p className="error">{error}</p> : null}
      {local.length || web.length ? (
        <ul className="results">
          {local.map((c) => (
            <li key={`l-${c.name}`} onClick={() => choose(c)}>
              <b>{c.name}</b> <span>{c.country}</span>
            </li>
          ))}
          {web.map((c, i) => (
            <li key={`w-${i}`} onClick={() => choose(c)} title={c.detail}>
              <b>{c.name}</b> <span>{c.detail ?? c.country}</span> <em>web</em>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="grid4">
        <label>
          Name shown in video
          <input value={place.name} onChange={(e) => setPlace({name: e.target.value})} />
        </label>
        <label>
          Country
          <input value={place.country ?? ''} onChange={(e) => setPlace({country: e.target.value})} />
        </label>
        <label>
          Latitude
          <input type="number" step="0.01" value={place.lat} onChange={(e) => setPlace({lat: Number(e.target.value)})} />
        </label>
        <label>
          Longitude
          <input type="number" step="0.01" value={place.lon} onChange={(e) => setPlace({lon: Number(e.target.value)})} />
        </label>
      </div>

      <div className="row">
        <label className="grow">
          Region (round 2 answer)
          <select value={place.subId ?? ''} onChange={(e) => setPlace({subId: e.target.value || undefined})}>
            <option value="">Auto-detect from coordinates</option>
            {ZONES.map((z) => (
              <optgroup key={z.id} label={z.name}>
                {SUBREGIONS.filter((s) => s.zone === z.id).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      </div>

      {detected ? (
        <p className="path">
          <span>{detected.zone.name}</span> → <span>{detected.sub.name}</span> → <span>{place.name}</span>
        </p>
      ) : (
        <p className="error">{'error' in plan ? plan.error : ''}</p>
      )}
    </section>
  );
};
