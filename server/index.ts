/**
 * Local API for the portal:
 *   POST /api/upload           photo / music upload  → {url: "/uploads/…"}
 *   GET  /api/geocode?q=        place search via OpenStreetMap Nominatim
 *   POST /api/render           start an MP4 render   → {id}
 *   GET  /api/render/:id       render progress
 *   POST /api/cover            render the cover still → {url: "/out/….png"}
 *   GET  /api/renders          finished videos in out/
 *   GET/POST /api/projects     saved projects (data/projects/*.json)
 */
import express from 'express';
import multer from 'multer';
import {randomUUID} from 'node:crypto';
import {existsSync, mkdirSync, readdirSync, readFileSync, statSync, watch, writeFileSync} from 'node:fs';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import type {VideoProps} from '../shared/types';

const PORT = Number(process.env.PORT ?? 3001);
const ROOT = path.resolve(import.meta.dirname, '..');
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

type Job = {status: 'bundling' | 'rendering' | 'done' | 'error'; progress: number; url?: string; error?: string};
const jobs = new Map<string, Job>();

/** Uploaded files are referenced as "/uploads/…" in projects; the headless browser needs absolute URLs. */
const absolutize = (src: string) => (src.startsWith('/uploads/') ? `http://localhost:${PORT}${src}` : src);

const toInputProps = (props: VideoProps): VideoProps => ({
  ...props,
  photos: props.photos.map((p) => ({...p, src: absolutize(p.src)})) as VideoProps['photos'],
  music: props.music ? {...props.music, src: absolutize(props.music.src)} : null,
});
const outName = (props: VideoProps) => `${slug(props.place.name)}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}`;

app.post('/api/render', (req, res) => {
  const props = req.body.props as VideoProps;
  const id = randomUUID().slice(0, 8);
  const job: Job = {status: 'bundling', progress: 0};
  jobs.set(id, job);
  res.json({id});

  const inputProps = toInputProps(props);
  const file = `${outName(props)}.mp4`;

  (async () => {
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
  })().catch((e: Error) => {
    console.error(e);
    job.status = 'error';
    job.error = e.message;
  });
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
