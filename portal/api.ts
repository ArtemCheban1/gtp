import type {Place, VideoProps, VoiceClip} from '../shared/types';

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

export type RenderJob = {
  status: 'queued' | 'bundling' | 'rendering' | 'done' | 'error';
  progress: number;
  label?: string;
  url?: string;
  error?: string;
};
export const startRender = async (props: VideoProps) =>
  json<{id: string}>(
    await fetch('/api/render', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({props})}),
  );
export const renderCover = async (props: VideoProps) =>
  json<{url: string}>(
    await fetch('/api/cover', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({props})}),
  );
export const getRender = async (id: string) => json<RenderJob>(await fetch(`/api/render/${id}`));
export const listRenders = async () => json<{name: string; url: string; time: number}[]>(await fetch('/api/renders'));

export const listProjects = async () => json<{id: string; time: number}[]>(await fetch('/api/projects'));
export const loadProject = async (id: string) => json<VideoProps>(await fetch(`/api/projects/${encodeURIComponent(id)}`));
export const saveProject = async (name: string, props: VideoProps) =>
  json<{id: string}>(
    await fetch('/api/projects', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name, props})}),
  );

export const queueProjects = async (projects: string[]) =>
  json<{queued: {project: string; id: string}[]; missing: string[]}>(
    await fetch('/api/queue', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({projects})}),
  );
export const listJobs = async () => json<(RenderJob & {id: string})[]>(await fetch('/api/jobs'));

export const voiceEngine = async () => json<{engine: string | null}>(await fetch('/api/voice/engine'));
export const generateVoice = async (props: VideoProps) =>
  json<{engine: string; clips: VoiceClip[]}>(
    await fetch('/api/voice', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({props})}),
  );

export type PublishTarget = 'facebook' | 'instagram';
export type PublishResult = {target: PublishTarget; status: 'pending' | 'uploading' | 'processing' | 'done' | 'error'; id?: string; error?: string};
export const publishConfig = async () => json<Record<PublishTarget, boolean>>(await fetch('/api/publish/config'));
export const startPublish = async (video: string, caption: string, targets: PublishTarget[]) =>
  json<{id: string}>(
    await fetch('/api/publish', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({video, caption, targets})}),
  );
export const getPublish = async (id: string) => json<PublishResult[]>(await fetch(`/api/publish/${id}`));

export type PhotoSource = 'wikimedia' | 'openverse' | 'mapillary' | 'pexels' | 'pixabay';
export type FoundPhoto = {id: string; source: PhotoSource; thumb: string; full: string; width?: number; height?: number; credit: string; page: string};
export const photoSources = async () => json<Record<PhotoSource, boolean>>(await fetch('/api/photos/sources'));
/** `near`: also search around the coordinates (only while the query is the place name itself). */
export const searchPhotos = async (source: PhotoSource, lat: number, lon: number, q: string, near: boolean) =>
  json<FoundPhoto[]>(
    await fetch(`/api/photos/search?${new URLSearchParams({source, lat: String(lat), lon: String(lon), q, near: near ? '1' : '0'})}`),
  );
export const importPhoto = async (url: string) =>
  json<{url: string}>(
    await fetch('/api/photos/import', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({url})}),
  );
