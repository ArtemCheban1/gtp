/**
 * Photo search for the portal's "Find photos" panel. Only sources/licences that allow commercial use.
 *   Wikimedia Commons  — always on; geotagged photos near the place + photos matching its name.
 *                        Keeps CC0 / public domain / CC BY / CC BY-SA, drops NC / ND / GFDL-only.
 *   Mapillary          — street-level photos (CC BY-SA 4.0); needs MAPILLARY_TOKEN in .env (free client token)
 *   Pexels             — stock photos by place name (Pexels License); needs PEXELS_API_KEY in .env
 * Only URLs returned by a search can be downloaded (see importAllowed).
 */
export type PhotoSource = 'wikimedia' | 'mapillary' | 'pexels';

export type FoundPhoto = {
  id: string;
  source: PhotoSource;
  thumb: string;
  /** Big enough for the video (≤ ~1920px wide) */
  full: string;
  /** Tried when `full` can't be downloaded (the original file) */
  fallback?: string;
  width?: number;
  height?: number;
  /** Ready-made attribution, e.g. "Jan Novák, CC BY-SA 4.0, Wikimedia Commons" */
  credit: string;
  /** Page of the photo, for checking the licence */
  page: string;
};

/** Standard Commons thumbnail widths (see https://w.wiki/GHai) */
const THUMB_SMALL = 330;
const THUMB_FULL = 1920;

const UA = {'User-Agent': 'guess-the-place-portal/0.1 (local tool)'};

export const photoSources = (): Record<PhotoSource, boolean> => ({
  wikimedia: true,
  mapillary: !!process.env.MAPILLARY_TOKEN,
  pexels: !!process.env.PEXELS_API_KEY,
});

const stripHtml = (s: string) =>
  s
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();

/** Licences that allow commercial reuse (with attribution where required). */
export function commercialLicence(name: string): boolean {
  const n = name.trim();
  if (/\b(NC|ND)\b|noncommercial|no ?deriv/i.test(n)) return false;
  return /^(CC0|Public domain|PD\b|PD-|CC[ -]BY(-SA)?\b)/i.test(n);
}

type CommonsPage = {
  pageid: number;
  title: string;
  imageinfo?: {
    url: string;
    thumburl?: string;
    descriptionurl: string;
    width: number;
    height: number;
    mime: string;
    extmetadata?: Record<string, {value: string} | undefined>;
  }[];
};

/** Turns a Commons API `query.pages` object into photos (exported for tests). */
export function parseCommons(pages: Record<string, CommonsPage> | undefined): FoundPhoto[] {
  const out: FoundPhoto[] = [];
  for (const p of Object.values(pages ?? {})) {
    const ii = p.imageinfo?.[0];
    if (!ii || !/^image\/(jpeg|png|webp)$/.test(ii.mime) || ii.width < 800) continue;
    const licence = stripHtml(ii.extmetadata?.LicenseShortName?.value ?? '');
    if (!commercialLicence(licence)) continue;
    const artist = stripHtml(ii.extmetadata?.Artist?.value ?? '') || 'Unknown author';
    // Commons thumbnails: …/thumb/a/ab/Name.jpg/330px-Name.jpg. Commons only serves standard widths
    // (…, 960, 1280, 1920, 3840 — other sizes answer HTTP 400), so ask for 1920px when the original is bigger.
    const full = ii.thumburl && ii.width > 1920 ? ii.thumburl.replace(/\/\d+px-([^/]+)$/, `/${THUMB_FULL}px-$1`) : ii.url;
    out.push({
      id: `wm-${p.pageid}`,
      source: 'wikimedia',
      thumb: ii.thumburl ?? ii.url,
      full,
      fallback: full === ii.url ? undefined : ii.url,
      width: ii.width,
      height: ii.height,
      credit: `${artist.slice(0, 60)}, ${licence}, Wikimedia Commons`,
      page: ii.descriptionurl,
    });
  }
  return out;
}

async function commons(params: Record<string, string>): Promise<FoundPhoto[]> {
  const qs = new URLSearchParams({
    action: 'query',
    format: 'json',
    prop: 'imageinfo',
    iiprop: 'url|size|mime|extmetadata',
    iiurlwidth: String(THUMB_SMALL),
    iiextmetadatafilter: 'LicenseShortName|Artist',
    ...params,
  });
  const r = await fetch(`https://commons.wikimedia.org/w/api.php?${qs}`, {headers: UA});
  if (!r.ok) throw new Error(`Wikimedia ${r.status}`);
  const body = (await r.json()) as {query?: {pages?: Record<string, CommonsPage>}};
  return parseCommons(body.query?.pages);
}

async function searchWikimedia(lat: number, lon: number, name: string): Promise<FoundPhoto[]> {
  const [near, named] = await Promise.all([
    commons({generator: 'geosearch', ggsnamespace: '6', ggscoord: `${lat}|${lon}`, ggsradius: '10000', ggslimit: '50'}),
    name ? commons({generator: 'search', gsrsearch: `${name} filetype:bitmap`, gsrnamespace: '6', gsrlimit: '30'}) : [],
  ]);
  const seen = new Set<string>();
  return [...near, ...named].filter((p) => !seen.has(p.id) && seen.add(p.id));
}

async function searchMapillary(lat: number, lon: number): Promise<FoundPhoto[]> {
  const d = 0.01; // Mapillary only accepts small boxes (~1 km around the point)
  const qs = new URLSearchParams({
    access_token: process.env.MAPILLARY_TOKEN!,
    fields: 'id,thumb_256_url,thumb_2048_url,creator,width,height',
    bbox: [lon - d, lat - d, lon + d, lat + d].join(','),
    limit: '40',
  });
  const r = await fetch(`https://graph.mapillary.com/images?${qs}`);
  if (!r.ok) throw new Error(`Mapillary ${r.status}`);
  const body = (await r.json()) as {
    data?: {id: string; thumb_256_url: string; thumb_2048_url: string; creator?: {username?: string}; width?: number; height?: number}[];
  };
  return (body.data ?? []).map((m) => ({
    id: `ml-${m.id}`,
    source: 'mapillary' as const,
    thumb: m.thumb_256_url,
    full: m.thumb_2048_url,
    width: m.width,
    height: m.height,
    credit: `${m.creator?.username ?? 'Mapillary contributor'}, CC BY-SA 4.0, Mapillary`,
    page: `https://www.mapillary.com/app/?pKey=${m.id}`,
  }));
}

async function searchPexels(name: string): Promise<FoundPhoto[]> {
  if (!name) return [];
  const r = await fetch(`https://api.pexels.com/v1/search?${new URLSearchParams({query: name, per_page: '30'})}`, {
    headers: {Authorization: process.env.PEXELS_API_KEY!},
  });
  if (!r.ok) throw new Error(`Pexels ${r.status}`);
  const body = (await r.json()) as {
    photos?: {id: number; width: number; height: number; url: string; photographer: string; src: {medium: string; large2x: string}}[];
  };
  return (body.photos ?? []).map((p) => ({
    id: `px-${p.id}`,
    source: 'pexels' as const,
    thumb: p.src.medium,
    full: p.src.large2x,
    width: p.width,
    height: p.height,
    credit: `${p.photographer}, Pexels`,
    page: p.url,
  }));
}

/**
 * Full-size URLs handed out by searches. Only these can be downloaded through /api/photos/import,
 * whatever CDN host a source happens to use (Mapillary/Commons serve from several).
 */
const issued = new Map<string, string | undefined>();

function remember(photos: FoundPhoto[]): FoundPhoto[] {
  for (const p of photos) issued.set(p.full, p.fallback);
  // keep memory bounded; old searches simply need to be repeated
  while (issued.size > 5000) issued.delete(issued.keys().next().value!);
  return photos;
}

export async function searchPhotos(source: PhotoSource, lat: number, lon: number, name: string): Promise<FoundPhoto[]> {
  if (!photoSources()[source]) throw new Error(`${source} is not configured in .env`);
  if (source === 'mapillary') return remember(await searchMapillary(lat, lon));
  if (source === 'pexels') return remember(await searchPexels(name));
  return remember(await searchWikimedia(lat, lon, name));
}

/** Second URL to try when downloading `url` fails (e.g. the original file behind a thumbnail). */
export const fallbackFor = (url: string) => issued.get(url);

/** A URL may be imported if a search returned it (https only). */
export function importAllowed(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:' && issued.has(url);
  } catch {
    return false;
  }
}
