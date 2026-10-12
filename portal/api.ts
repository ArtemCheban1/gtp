import type {Place, VideoProps} from '../shared/types';

async function json<T>(r: Response): Promise<T> {
  const body = await r.json();
  if (!r.ok) throw new Error(body.error ?? r.statusText);
  return body as T;
}

export async function uploadFile(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const {url} = await json<{url: string}>(await fetch('/api/upload', {method: 'POST', body: form}));
  return url;
}

export type GeoResult = Place & {detail?: string};
export const geocode = async (q: string) => json<GeoResult[]>(await fetch(`/api/geocode?q=${encodeURIComponent(q)}`));

export type RenderJob = {status: 'bundling' | 'rendering' | 'done' | 'error'; progress: number; url?: string; error?: string};
export const startRender = async (props: VideoProps) =>
  json<{id: string}>(
    await fetch('/api/render', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({props})}),
  );
export const getRender = async (id: string) => json<RenderJob>(await fetch(`/api/render/${id}`));
export const listRenders = async () => json<{name: string; url: string; time: number}[]>(await fetch('/api/renders'));

export const listProjects = async () => json<{id: string; time: number}[]>(await fetch('/api/projects'));
export const loadProject = async (id: string) => json<VideoProps>(await fetch(`/api/projects/${encodeURIComponent(id)}`));
export const saveProject = async (name: string, props: VideoProps) =>
  json<{id: string}>(
    await fetch('/api/projects', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name, props})}),
  );
