/**
 * Local API for the portal:
 *   POST /api/upload           photo / music upload  → {url: "/uploads/…"}
 *   GET  /api/geocode?q=        place search via OpenStreetMap Nominatim
 *   GET  /api/photos/search     free-licence photos (?source&lat&lon&q&near=0|1)
 *   POST /api/photos/import     download a found photo into uploads → {url}
 *   POST /api/render           queue an MP4 render   → {id}
 *   GET  /api/render/:id       render progress
 *   POST /api/queue            queue saved projects for rendering (one at a time) → {queued, missing}
 *   GET  /api/jobs             all render jobs, newest first
 *   POST /api/cover            render the cover still → {url: "/out/….png"}
 *   GET  /api/renders          finished videos in out/
 *   GET  /api/voice/engine     which text-to-speech engine is configured
 *   POST /api/voice            synthesise the 3 reveal lines → {clips}
 *   GET  /api/publish/config   which of Facebook / Instagram are configured in .env
 *   POST /api/publish          publish a rendered MP4 as a Reel → {id}; GET /api/publish/:id for progress
 *   GET/POST /api/projects     saved projects (data/projects/*.json)
 */
import express from 'express';
import multer from 'multer';
import {randomUUID} from 'node:crypto';
import {existsSync, mkdirSync, readdirSync, readFileSync, statSync, watch, writeFileSync} from 'node:fs';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import {DEFAULT_PROPS} from '../shared/defaults';
import {buildPlan} from '../shared/rounds';
import type {VideoProps} from '../shared/types';
import {fallbackFor, importAllowed, photoSources, searchPhotos, type PhotoSource} from './photos';
import {publish, publishConfig, type PublishResult, type Target} from './publish';
import {pickEngine, synthesize} from './voice';

const ROOT = path.resolve(import.meta.dirname, '..');
// API keys etc. live in .env (git-ignored)
if (existsSync(path.join(ROOT, '.env'))) process.loadEnvFile(path.join(ROOT, '.env'));
const PORT = Number(process.env.PORT ?? 3001);
const UPLOADS = path.join(ROOT, 'data', 'uploads');
const PROJECTS = path.join(ROOT, 'data', 'projects');
const OUT = path.join(ROOT, 'out');
for (const dir of [UPLOADS, PROJECTS, OUT]) mkdirSync(dir, {recursive: true});

const app = express();
app.use(express.json({limit: '5mb'}));
app.use((_, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});
app.use('/uploads', express.static(UPLOADS));
app.use('/out', express.static(OUT));

const slug = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'video';

// ── Uploads ──────────────────────────────────────────────
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS,
    filename: (_, file, cb) => cb(null, `${Date.now()}-${randomUUID().slice(0, 8)}${path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '')}`),
  }),
  limits: {fileSize: 60 * 1024 * 1024},
  fileFilter: (_, file, cb) => cb(null, /^(image|audio)\//.test(file.mimetype)),
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({error: 'Only images and audio files are accepted'});
    return;
  }
  res.json({url: `/uploads/${req.file.filename}`});
});

// ── Geocoding (server-side so we can send the User-Agent Nominatim requires) ──
app.get('/api/geocode', async (req, res) => {
  const q = String(req.query.q ?? '').trim();
  if (!q) {
    res.json([]);
    return;
  }
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&accept-language=en&q=${encodeURIComponent(q)}`;
    const r = await fetch(url, {headers: {'User-Agent': 'guess-the-place-portal/0.1 (local tool)'}});
    const data = (await r.json()) as {name: string; display_name: string; lat: string; lon: string; address?: {country?: string}}[];
    res.json(
      data.map((d) => ({
        name: d.name || d.display_name.split(',')[0],
        country: d.address?.country,
        lat: Number(Number(d.lat).toFixed(4)),
        lon: Number(Number(d.lon).toFixed(4)),
        detail: d.display_name,
      })),
    );
  } catch (e) {
    res.status(502).json({error: `Geocoding failed: ${(e as Error).message}`});
  }
});

// ── Photo search (free-licence sources) ───────────────────────
app.get('/api/photos/sources', (_, res) => {
  res.json(photoSources());
});

app.get('/api/photos/search', async (req, res) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  const source = String(req.query.source ?? 'wikimedia') as PhotoSource;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    res.status(400).json({error: 'lat/lon required'});
    return;
  }
  try {
    res.json(await searchPhotos(source, lat, lon, String(req.query.q ?? '').trim(), req.query.near !== '0'));
  } catch (e) {
    res.status(502).json({error: `Photo search failed: ${(e as Error).message}`});
  }
});

const IMAGE_EXT: Record<string, string> = {'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp'};

const MAX_IMAGE = 25 * 1024 * 1024;

async function downloadImage(url: string): Promise<{buf: Buffer; ext: string}> {
  const r = await fetch(url, {headers: {'User-Agent': 'guess-the-place-portal/0.1 (local tool)'}});
  const type = (r.headers.get('content-type') ?? '').split(';')[0];
  if (!r.ok || !IMAGE_EXT[type]) throw new Error(`download failed (${r.status} ${type})`);
  if (Number(r.headers.get('content-length') ?? 0) > MAX_IMAGE) throw new Error('image is larger than 25 MB');
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > MAX_IMAGE) throw new Error('image is larger than 25 MB');
  return {buf, ext: IMAGE_EXT[type]};
}

/** Downloads a found photo into uploads → {url: "/uploads/…"} (falls back to the original file) */
app.post('/api/photos/import', async (req, res) => {
  const url = String(req.body.url ?? '');
  if (!importAllowed(url)) {
    res.status(400).json({error: 'Unknown photo — search again and pick it from the results (the server was probably restarted)'});
    return;
  }
  try {
    let image: {buf: Buffer; ext: string};
    try {
      image = await downloadImage(url);
    } catch (e) {
      const fallback = fallbackFor(url);
      if (!fallback) throw e;
      console.warn(`Photo download failed (${(e as Error).message}), trying the original file`);
      image = await downloadImage(fallback);
    }
    const name = `${Date.now()}-${randomUUID().slice(0, 8)}${image.ext}`;
    writeFileSync(path.join(UPLOADS, name), image.buf);
    res.json({url: `/uploads/${name}`});
  } catch (e) {
    res.status(502).json({error: `Import failed: ${(e as Error).message}`});
  }
});

// ── Rendering ────────────────────────────────────────────
let bundlePromise: Promise<string> | null = null;
const getBundle = () => {
  bundlePromise ??= bundle({entryPoint: path.join(ROOT, 'remotion', 'index.ts'), publicDir: path.join(ROOT, 'public')});
  return bundlePromise;
};
// Re-bundle on the next render whenever the video code changes
for (const dir of ['remotion', 'shared']) {
  watch(path.join(ROOT, dir), {recursive: true}, () => {
    bundlePromise = null;
  });
}

type Job = {
  status: 'queued' | 'bundling' | 'rendering' | 'done' | 'error';
  progress: number;
  /** Shown in the portal queue, e.g. the place name */
  label: string;
  created: number;
  url?: string;
  error?: string;
};
const jobs = new Map<string, Job>();

/** Uploaded files are referenced as "/uploads/…" in projects; the headless browser needs absolute URLs. */
const absolutize = (src: string) => (src.startsWith('/uploads/') ? `http://localhost:${PORT}${src}` : src);

const toInputProps = (props: VideoProps): VideoProps => ({
  ...props,
  photos: props.photos.map((p) => ({...p, src: absolutize(p.src)})) as VideoProps['photos'],
  music: props.music ? {...props.music, src: absolutize(props.music.src)} : null,
  voice: props.voice ? {...props.voice, clips: props.voice.clips.map((c) => (c ? {...c, src: absolutize(c.src)} : null))} : undefined,
});
const outName = (props: VideoProps) => `${slug(props.place.name)}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}`;

// Renders are heavy (they use every CPU core), so they run one at a time in submission order.
let queueTail: Promise<void> = Promise.resolve();

async function runRender(job: Job, props: VideoProps) {
  job.status = 'bundling';
  const inputProps = toInputProps(props);
  const file = `${outName(props)}.mp4`;
  const serveUrl = await getBundle();
  job.status = 'rendering';
  const browserExecutable = process.env.BROWSER_EXECUTABLE || undefined;
  const composition = await selectComposition({serveUrl, id: 'GuessThePlace', inputProps, browserExecutable});
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    outputLocation: path.join(OUT, file),
    inputProps,
    browserExecutable,
    onProgress: ({progress}) => {
      job.progress = progress;
    },
  });
  job.status = 'done';
  job.progress = 1;
  job.url = `/out/${file}`;
  console.log(`✓ Rendered out/${file}`);
}

function enqueueRender(props: VideoProps, label = props.place.name): string {
  const id = randomUUID().slice(0, 8);
  const job: Job = {status: 'queued', progress: 0, label, created: Date.now()};
  jobs.set(id, job);
  queueTail = queueTail.then(() =>
    runRender(job, props).catch((e: Error) => {
      console.error(e);
      job.status = 'error';
      job.error = e.message;
    }),
  );
  return id;
}

app.post('/api/render', (req, res) => {
  res.json({id: enqueueRender(req.body.props as VideoProps)});
});

/** Batch: queue several saved projects by id. */
app.post('/api/queue', (req, res) => {
  const ids = (req.body.projects ?? []) as string[];
  const queued: {project: string; id: string}[] = [];
  const missing: string[] = [];
  for (const project of ids) {
    const file = path.join(PROJECTS, `${slug(project)}.json`);
    if (!existsSync(file)) {
      missing.push(project);
      continue;
    }
    const props = {...DEFAULT_PROPS, ...JSON.parse(readFileSync(file, 'utf8'))} as VideoProps;
    queued.push({project, id: enqueueRender(props, project)});
  }
  res.json({queued, missing});
});

app.get('/api/jobs', (_, res) => {
  res.json(
    [...jobs.entries()]
      .map(([id, j]) => ({id, ...j}))
      .sort((a, b) => b.created - a.created)
      .slice(0, 50),
  );
});

app.post('/api/cover', async (req, res) => {
  const inputProps = toInputProps(req.body.props as VideoProps);
  const file = `${outName(inputProps)}-cover.png`;
  try {
    const serveUrl = await getBundle();
    const browserExecutable = process.env.BROWSER_EXECUTABLE || undefined;
    const composition = await selectComposition({serveUrl, id: 'Cover', inputProps, browserExecutable});
    await renderStill({composition, serveUrl, output: path.join(OUT, file), inputProps, browserExecutable, imageFormat: 'png'});
    console.log(`✓ Rendered out/${file}`);
    res.json({url: `/out/${file}`});
  } catch (e) {
    console.error(e);
    res.status(500).json({error: (e as Error).message});
  }
});

app.get('/api/render/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) res.status(404).json({error: 'Unknown render'});
  else res.json(job);
});

app.get('/api/renders', (_, res) => {
  const files = readdirSync(OUT)
    .filter((f) => f.endsWith('.mp4') || f.endsWith('.png'))
    .map((f) => ({name: f, url: `/out/${f}`, time: statSync(path.join(OUT, f)).mtimeMs}))
    .sort((a, b) => b.time - a.time);
  res.json(files);
});

// ── Voice-over ───────────────────────────────────────────
/** The line spoken on each reveal. */
const voiceLine = (answer: string) => `It's ${answer}!`;

app.get('/api/voice/engine', (_, res) => {
  res.json({engine: pickEngine()?.name ?? null});
});

/** Generates the 3 reveal lines for these props → {clips: [{text, src}, …]} */
app.post('/api/voice', async (req, res) => {
  const engine = pickEngine();
  if (!engine) {
    res.status(400).json({error: 'No text-to-speech engine configured — set ELEVENLABS_API_KEY, OPENAI_API_KEY or TTS_COMMAND in .env, or upload your own recordings.'});
    return;
  }
  const plan = buildPlan(req.body.props as VideoProps);
  if ('error' in plan) {
    res.status(400).json({error: plan.error});
    return;
  }
  try {
    const clips = [];
    for (const r of plan.rounds) {
      const text = voiceLine(r.answerLabel);
      clips.push({text, src: `/uploads/${await synthesize(engine, text, UPLOADS)}`});
    }
    res.json({engine: engine.name, clips});
  } catch (e) {
    res.status(502).json({error: (e as Error).message});
  }
});

// ── Publishing (Facebook / Instagram Reels) ─────────────────
const publishJobs = new Map<string, PublishResult[]>();

app.get('/api/publish/config', (_, res) => {
  res.json(publishConfig());
});

app.post('/api/publish', (req, res) => {
  const name = path.basename(String(req.body.video ?? ''));
  const file = path.join(OUT, name);
  const caption = String(req.body.caption ?? '').slice(0, 2200); // Instagram's caption limit
  const config = publishConfig();
  const targets = ((req.body.targets ?? []) as Target[]).filter((t) => t === 'facebook' || t === 'instagram');
  if (!name.endsWith('.mp4') || !existsSync(file)) {
    res.status(400).json({error: 'Pick a rendered video first'});
    return;
  }
  const missing = targets.filter((t) => !config[t]);
  if (!targets.length || missing.length) {
    res.status(400).json({error: missing.length ? `Not configured in .env: ${missing.join(', ')}` : 'Choose where to publish'});
    return;
  }
  const id = randomUUID().slice(0, 8);
  const results: PublishResult[] = targets.map((target) => ({target, status: 'pending'}));
  publishJobs.set(id, results);
  publish(file, caption, results);
  res.json({id});
});

app.get('/api/publish/:id', (req, res) => {
  const results = publishJobs.get(req.params.id);
  if (!results) res.status(404).json({error: 'Unknown publish job'});
  else res.json(results);
});

// ── Projects ─────────────────────────────────────────────
app.get('/api/projects', (_, res) => {
  const list = readdirSync(PROJECTS)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({id: f.replace(/\.json$/, ''), time: statSync(path.join(PROJECTS, f)).mtimeMs}))
    .sort((a, b) => b.time - a.time);
  res.json(list);
});

app.get('/api/projects/:id', (req, res) => {
  const file = path.join(PROJECTS, `${slug(req.params.id)}.json`);
  if (!existsSync(file)) res.status(404).json({error: 'Not found'});
  else res.json(JSON.parse(readFileSync(file, 'utf8')));
});

app.post('/api/projects', (req, res) => {
  const props = req.body.props as VideoProps;
  const id = slug(req.body.name || props.place.name);
  writeFileSync(path.join(PROJECTS, `${id}.json`), JSON.stringify(props, null, 2));
  res.json({id});
});

// A failed render must never take the whole server down
process.on('unhandledRejection', (e) => console.error('Unhandled rejection:', e));

app.listen(PORT, () => {
  console.log(`API ready on http://localhost:${PORT} — open the portal at http://localhost:5173`);
});
