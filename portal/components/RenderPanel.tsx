import React, {useEffect, useState} from 'react';
import type {VideoProps} from '../../shared/types';
import {getRender, listRenders, renderCover, startRender, type RenderJob} from '../api';

export const RenderPanel: React.FC<{props: VideoProps; disabled: boolean}> = ({props, disabled}) => {
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<RenderJob | null>(null);
  const [error, setError] = useState('');
  const [cover, setCover] = useState<{busy: boolean; url?: string}>({busy: false});
  const [renders, setRenders] = useState<{name: string; url: string}[]>([]);

  const refresh = () => listRenders().then(setRenders).catch(() => setRenders([]));
  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!jobId) return;
    const t = setInterval(async () => {
      try {
        const j = await getRender(jobId);
        setJob(j);
        if (j.status === 'done' || j.status === 'error') {
          clearInterval(t);
          setJobId(null);
          refresh();
        }
      } catch (e) {
        setError((e as Error).message);
        clearInterval(t);
        setJobId(null);
      }
    }, 700);
    return () => clearInterval(t);
  }, [jobId]);

  const go = async () => {
    setError('');
    setJob({status: 'bundling', progress: 0});
    try {
      setJobId((await startRender(props)).id);
    } catch (e) {
      setError(`${(e as Error).message} — is the server running (npm run dev)?`);
      setJob(null);
    }
  };

  const goCover = async () => {
    setError('');
    setCover({busy: true});
    try {
      setCover({busy: false, url: (await renderCover(props)).url});
      refresh();
    } catch (e) {
      setError(`Cover: ${(e as Error).message}`);
      setCover({busy: false});
    }
  };

  const missing = props.photos.filter((p) => !p.src).length;
  const running = job && (job.status === 'queued' || job.status === 'bundling' || job.status === 'rendering');

  return (
    <section className="card render">
      <button className="primary" onClick={go} disabled={disabled || !!running}>
        {running ? 'Rendering…' : 'Render MP4'}
      </button>
      <button onClick={goCover} disabled={disabled || cover.busy}>
        {cover.busy ? 'Rendering cover…' : 'Render cover'}
      </button>
      {cover.url ? (
        <a className="download" href={cover.url} download>
          Download cover
        </a>
      ) : null}
      {missing ? <p className="hint">{missing} photo slot(s) still empty — they'll show a placeholder.</p> : null}
      {job ? (
        <div className="progress">
          <div style={{width: `${Math.round(job.progress * 100)}%`}} />
          <span>
            {job.status === 'queued' ? 'Waiting in queue…' : job.status === 'bundling' ? 'Preparing…' : job.status === 'rendering' ? `${Math.round(job.progress * 100)}%` : job.status}
          </span>
        </div>
      ) : null}
      {job?.status === 'done' && job.url ? (
        <a className="download" href={job.url} download>
          Download video
        </a>
      ) : null}
      {job?.error || error ? <p className="error">{job?.error || error}</p> : null}
      {renders.length ? (
        <details>
          <summary>Previous renders ({renders.length})</summary>
          <ul className="files">
            {renders.slice(0, 15).map((r) => (
              <li key={r.name}>
                <a href={r.url} download>
                  {r.name}
                </a>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
};
