import React, {useEffect, useState} from 'react';
import {listJobs, listProjects, queueProjects, type RenderJob} from '../api';

type JobRow = RenderJob & {id: string};
const ACTIVE: RenderJob['status'][] = ['queued', 'bundling', 'rendering'];

/** Batch mode: tick saved projects and render them one after another on the server. */
export const QueuePanel: React.FC = () => {
  const [projects, setProjects] = useState<{id: string}[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [error, setError] = useState('');

  const refreshJobs = () => listJobs().then(setJobs).catch(() => undefined);
  useEffect(() => {
    listProjects().then(setProjects).catch(() => setProjects([]));
    refreshJobs();
  }, []);

  const active = jobs.some((j) => ACTIVE.includes(j.status));
  useEffect(() => {
    if (!active) return;
    const t = setInterval(refreshJobs, 1000);
    return () => clearInterval(t);
  }, [active]);

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const go = async () => {
    setError('');
    try {
      const {missing} = await queueProjects([...picked]);
      if (missing.length) setError(`Not found: ${missing.join(', ')}`);
      setPicked(new Set());
      refreshJobs();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <section className="card">
      <h2>5 · Batch queue</h2>
      <p className="hint">Tick saved projects and render them one after another. You can keep editing meanwhile.</p>
      {projects.length ? (
        <div className="queue-projects">
          {projects.map((p) => (
            <label key={p.id} className="check">
              <input type="checkbox" checked={picked.has(p.id)} onChange={() => toggle(p.id)} /> {p.id}
            </label>
          ))}
        </div>
      ) : (
        <p className="hint">No saved projects yet — use "Save" at the top.</p>
      )}
      <div className="row tight">
        <button className="primary" disabled={!picked.size} onClick={go}>
          Render {picked.size || ''} selected
        </button>
        <button onClick={() => listProjects().then(setProjects)}>Refresh list</button>
      </div>
      {error ? <p className="error">{error}</p> : null}
      {jobs.length ? (
        <ul className="jobs">
          {jobs.map((j) => (
            <li key={j.id}>
              <b>{j.label ?? j.id}</b>{' '}
              {j.status === 'done' && j.url ? (
                <a className="download" href={j.url} download>
                  Download
                </a>
              ) : j.status === 'error' ? (
                <span className="error">{j.error}</span>
              ) : j.status === 'rendering' ? (
                <span>{Math.round(j.progress * 100)}%</span>
              ) : (
                <span>{j.status === 'queued' ? 'waiting…' : 'preparing…'}</span>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
};
