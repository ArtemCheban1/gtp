import React, {useEffect, useMemo, useState} from 'react';
import {buildCaption} from '../../shared/caption';
import type {VideoProps} from '../../shared/types';
import {getPublish, listRenders, publishConfig, startPublish, type PublishResult, type PublishTarget} from '../api';

const LABEL: Record<PublishTarget, string> = {facebook: 'Facebook Reel', instagram: 'Instagram Reel'};

/** Ready-to-paste post text with hashtags, and one-click publishing when Meta tokens are set up. */
export const CaptionPanel: React.FC<{props: VideoProps}> = ({props}) => {
  const generated = useMemo(() => buildCaption(props), [props]);
  const [edited, setEdited] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const text = edited ?? generated;

  const [config, setConfig] = useState<Record<PublishTarget, boolean> | null>(null);
  const [videos, setVideos] = useState<string[]>([]);
  const [video, setVideo] = useState('');
  const [targets, setTargets] = useState<Set<PublishTarget>>(new Set());
  const [jobId, setJobId] = useState<string | null>(null);
  const [results, setResults] = useState<PublishResult[]>([]);
  const [error, setError] = useState('');

  const refreshVideos = () =>
    listRenders()
      .then((r) => {
        const mp4 = r.filter((f) => f.name.endsWith('.mp4')).map((f) => f.name);
        setVideos(mp4);
        setVideo((v) => (v && mp4.includes(v) ? v : mp4[0] ?? ''));
      })
      .catch(() => setVideos([]));

  useEffect(() => {
    publishConfig()
      .then((c) => {
        setConfig(c);
        setTargets(new Set((Object.keys(c) as PublishTarget[]).filter((t) => c[t])));
      })
      .catch(() => setConfig(null));
    refreshVideos();
  }, []);

  useEffect(() => {
    if (!jobId) return;
    const t = setInterval(async () => {
      try {
        const r = await getPublish(jobId);
        setResults(r);
        if (r.every((x) => x.status === 'done' || x.status === 'error')) setJobId(null);
      } catch (e) {
        setError((e as Error).message);
        setJobId(null);
      }
    }, 2000);
    return () => clearInterval(t);
  }, [jobId]);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const publish = async () => {
    const where = [...targets].map((t) => LABEL[t]).join(' and ');
    if (!window.confirm(`Publish ${video} as a public ${where} now?`)) return;
    setError('');
    setResults([]);
    try {
      setJobId((await startPublish(video, text, [...targets])).id);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const available = config ? (Object.keys(config) as PublishTarget[]).filter((t) => config[t]) : [];

  return (
    <section className="card">
      <h2>Post caption</h2>
      <textarea className="caption" rows={9} value={text} onChange={(e) => setEdited(e.target.value)} />
      <div className="row tight">
        <button className="primary" onClick={copy}>
          {copied ? 'Copied ✓' : 'Copy caption'}
        </button>
        {edited !== null ? <button onClick={() => setEdited(null)}>Regenerate</button> : null}
      </div>

      <h2>Publish</h2>
      {available.length ? (
        <>
          <div className="row tight">
            <select className="grow" value={video} onChange={(e) => setVideo(e.target.value)} onFocus={refreshVideos}>
              {videos.length ? null : <option value="">Render a video first</option>}
              {videos.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="row tight">
            {available.map((t) => (
              <label key={t} className="check">
                <input
                  type="checkbox"
                  checked={targets.has(t)}
                  onChange={() =>
                    setTargets((prev) => {
                      const next = new Set(prev);
                      if (next.has(t)) next.delete(t);
                      else next.add(t);
                      return next;
                    })
                  }
                />{' '}
                {LABEL[t]}
              </label>
            ))}
          </div>
          <button className="primary" disabled={!video || !targets.size || !!jobId} onClick={publish}>
            {jobId ? 'Publishing…' : 'Publish with this caption'}
          </button>
          {results.length ? (
            <ul className="jobs">
              {results.map((r) => (
                <li key={r.target}>
                  <b>{LABEL[r.target]}</b>: {r.status === 'error' ? <span className="error">{r.error}</span> : r.status}
                  {r.id ? ` (id ${r.id})` : ''}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : (
        <p className="hint">
          {config
            ? 'To publish straight from here, add META_PAGE_TOKEN with META_PAGE_ID and/or META_IG_USER_ID to .env and restart (see server/publish.ts).'
            : 'Server not reachable.'}
        </p>
      )}
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
};
