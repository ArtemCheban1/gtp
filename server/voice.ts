/**
 * Text-to-speech for the reveal voice-over ("It's Oceania!").
 * Engines, picked in this order (configure in .env, never commit keys):
 *   ELEVENLABS_API_KEY (+ ELEVENLABS_VOICE_ID)  → ElevenLabs
 *   OPENAI_API_KEY (+ OPENAI_TTS_VOICE, OPENAI_TTS_MODEL) → OpenAI speech
 *   TTS_COMMAND, e.g. `espeak-ng -w {out} {text}`  → any local CLI ({text} is passed safely via $TTS_TEXT)
 *   macOS `say` / `espeak-ng` on PATH → used automatically
 */
import {spawn, spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';

type Engine = {name: string; ext: 'mp3' | 'wav'; synth: (text: string, out: string) => Promise<void>};

const onPath = (bin: string) => spawnSync('sh', ['-c', `command -v ${bin}`]).status === 0;

function commandEngine(template: string, name: string): Engine {
  return {
    name,
    ext: 'wav',
    synth: (text, out) =>
      new Promise((resolve, reject) => {
        const cmd = template.replaceAll('{out}', `'${out.replaceAll("'", "'\\''")}'`).replaceAll('{text}', '"$TTS_TEXT"');
        const p = spawn('sh', ['-c', cmd], {env: {...process.env, TTS_TEXT: text}, stdio: ['ignore', 'ignore', 'pipe']});
        let err = '';
        p.stderr.on('data', (d) => (err += d));
        p.on('error', reject);
        p.on('close', (code) => (code === 0 && existsSync(out) ? resolve() : reject(new Error(`TTS command failed (${code}): ${err.trim()}`))));
      }),
  };
}

async function httpEngine(url: string, init: RequestInit, out: string) {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error(`TTS request failed: ${r.status} ${(await r.text()).slice(0, 200)}`);
  writeFileSync(out, Buffer.from(await r.arrayBuffer()));
}

export function pickEngine(): Engine | null {
  const env = process.env;
  if (env.ELEVENLABS_API_KEY) {
    const voice = env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
    return {
      name: 'ElevenLabs',
      ext: 'mp3',
      synth: (text, out) =>
        httpEngine(
          `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
          {
            method: 'POST',
            headers: {'xi-api-key': env.ELEVENLABS_API_KEY!, 'Content-Type': 'application/json', Accept: 'audio/mpeg'},
            body: JSON.stringify({text, model_id: env.ELEVENLABS_MODEL || 'eleven_multilingual_v2'}),
          },
          out,
        ),
    };
  }
  if (env.OPENAI_API_KEY) {
    return {
      name: 'OpenAI',
      ext: 'mp3',
      synth: (text, out) =>
        httpEngine(
          'https://api.openai.com/v1/audio/speech',
          {
            method: 'POST',
            headers: {Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json'},
            body: JSON.stringify({
              model: env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
              voice: env.OPENAI_TTS_VOICE || 'alloy',
              input: text,
              response_format: 'mp3',
            }),
          },
          out,
        ),
    };
  }
  if (env.TTS_COMMAND) return commandEngine(env.TTS_COMMAND, 'TTS_COMMAND');
  if (process.platform === 'darwin' && onPath('say')) {
    return commandEngine('say -o {out} --file-format=WAVE --data-format=LEI16@22050 {text}', 'macOS say');
  }
  if (onPath('espeak-ng')) return commandEngine('espeak-ng -w {out} {text}', 'espeak-ng');
  return null;
}

/** Synthesises `text` into `dir` (cached by engine + text) and returns the file name. */
export async function synthesize(engine: Engine, text: string, dir: string): Promise<string> {
  mkdirSync(dir, {recursive: true});
  const hash = createHash('sha1').update(`${engine.name}|${process.env.ELEVENLABS_VOICE_ID ?? ''}|${process.env.OPENAI_TTS_VOICE ?? ''}|${text}`).digest('hex').slice(0, 12);
  const file = `voice-${hash}.${engine.ext}`;
  const out = path.join(dir, file);
  if (!existsSync(out)) await engine.synth(text, out);
  return file;
}
