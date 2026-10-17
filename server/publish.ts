/**
 * Publishes a rendered MP4 as a Reel to a Facebook Page and/or an Instagram professional account
 * through the Meta Graph API. Both use resumable uploads, so the video does not need a public URL.
 *
 * .env (git-ignored — never commit tokens):
 *   META_PAGE_ID        Facebook Page id
 *   META_PAGE_TOKEN     long-lived Page access token (pages_manage_posts, pages_read_engagement,
 *                       instagram_basic, instagram_content_publish)
 *   META_IG_USER_ID     Instagram professional account id linked to the Page (optional)
 *   META_GRAPH_VERSION  default v21.0
 */
import {readFileSync, statSync} from 'node:fs';

export type Target = 'facebook' | 'instagram';
export type PublishResult = {target: Target; status: 'pending' | 'uploading' | 'processing' | 'done' | 'error'; id?: string; error?: string};

const env = () => ({
  page: process.env.META_PAGE_ID,
  token: process.env.META_PAGE_TOKEN,
  ig: process.env.META_IG_USER_ID,
  version: process.env.META_GRAPH_VERSION || 'v21.0',
});

export const publishConfig = () => {
  const e = env();
  return {facebook: !!(e.page && e.token), instagram: !!(e.ig && e.token)};
};

async function graph<T>(method: 'GET' | 'POST', path: string, params: Record<string, string>): Promise<T> {
  const e = env();
  const qs = new URLSearchParams({...params, access_token: e.token!});
  const url = `https://graph.facebook.com/${e.version}/${path}${method === 'GET' ? `?${qs}` : ''}`;
  const r = await fetch(url, method === 'POST' ? {method, body: qs} : undefined);
  const body = (await r.json()) as T & {error?: {message: string}};
  if (!r.ok || body.error) throw new Error(body.error?.message ?? `Graph API ${r.status}`);
  return body;
}

async function rupload(url: string, file: string) {
  const size = statSync(file).size;
  const r = await fetch(url, {
    method: 'POST',
    headers: {Authorization: `OAuth ${env().token}`, offset: '0', file_size: String(size)},
    body: readFileSync(file),
  });
  const body = (await r.json()) as {success?: boolean; error?: {message: string}; debug_info?: {message: string}};
  if (!r.ok || body.error || body.success === false) {
    throw new Error(body.error?.message ?? body.debug_info?.message ?? `Upload failed (${r.status})`);
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function facebookReel(file: string, caption: string, res: PublishResult) {
  const {page, version} = env();
  const start = await graph<{video_id: string}>('POST', `${page}/video_reels`, {upload_phase: 'start'});
  res.status = 'uploading';
  await rupload(`https://rupload.facebook.com/video-upload/${version}/${start.video_id}`, file);
  res.status = 'processing';
  await graph('POST', `${page}/video_reels`, {
    upload_phase: 'finish',
    video_id: start.video_id,
    video_state: 'PUBLISHED',
    description: caption,
  });
  res.id = start.video_id;
}

async function instagramReel(file: string, caption: string, res: PublishResult) {
  const {ig, version} = env();
  const container = await graph<{id: string}>('POST', `${ig}/media`, {media_type: 'REELS', upload_type: 'resumable', caption});
  res.status = 'uploading';
  await rupload(`https://rupload.facebook.com/ig-api-upload/${version}/${container.id}`, file);
  res.status = 'processing';
  // Instagram transcodes the video before it can be published (usually under a minute)
  for (let i = 0; ; i++) {
    const {status_code, status} = await graph<{status_code: string; status?: string}>('GET', container.id, {fields: 'status_code,status'});
    if (status_code === 'FINISHED') break;
    if (status_code === 'ERROR' || status_code === 'EXPIRED') throw new Error(`Instagram processing failed: ${status ?? status_code}`);
    if (i > 60) throw new Error('Instagram processing timed out');
    await wait(5000);
  }
  const published = await graph<{id: string}>('POST', `${ig}/media_publish`, {creation_id: container.id});
  res.id = published.id;
}

/** Publishes to each target in turn, updating `results` in place so the portal can poll progress. */
export async function publish(file: string, caption: string, results: PublishResult[]) {
  for (const res of results) {
    try {
      if (res.target === 'facebook') await facebookReel(file, caption, res);
      else await instagramReel(file, caption, res);
      res.status = 'done';
      console.log(`✓ Published to ${res.target}: ${res.id}`);
    } catch (e) {
      res.status = 'error';
      res.error = (e as Error).message;
      console.error(`✗ Publish to ${res.target} failed:`, e);
    }
  }
}
