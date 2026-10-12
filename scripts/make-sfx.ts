/**
 * Generates the royalty-free sound effects in public/sfx (pure synthesis, no samples).
 * Run: npm run make-sfx
 */
import {writeFileSync, mkdirSync} from 'node:fs';

const RATE = 44100;

function wav(samples: Float32Array): Buffer {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + samples.length * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(RATE, 24);
  buf.writeUInt32LE(RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((s, i) => buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), 44 + i * 2));
  return buf;
}

const make = (seconds: number, fn: (t: number) => number) => {
  const out = new Float32Array(Math.round(seconds * RATE));
  for (let i = 0; i < out.length; i++) out[i] = fn(i / RATE);
  return out;
};

const tone = (f: number, t: number) => Math.sin(2 * Math.PI * f * t);

// Woodblock-like tick
const tick = (f: number) =>
  make(0.09, (t) => (tone(f, t) * 0.7 + tone(f * 2.7, t) * 0.3) * Math.exp(-t * 60) * 0.8);

// Bright 3-note chime for the reveal (C6 E6 G6)
const reveal = make(0.9, (t) =>
  [1046.5, 1318.5, 1568].reduce((acc, f, i) => {
    const s = t - i * 0.07;
    return s < 0 ? acc : acc + (tone(f, s) + 0.3 * tone(f * 2, s)) * Math.exp(-s * 5) * 0.25;
  }, 0),
);

// Whoosh: filtered noise with a rising/falling envelope
let lp = 0;
const whoosh = make(0.45, (t) => {
  const p = t / 0.45;
  const cutoff = 0.02 + 0.25 * Math.sin(Math.PI * p);
  lp += cutoff * (Math.random() * 2 - 1 - lp);
  return lp * Math.sin(Math.PI * p) * 1.6;
});

mkdirSync('public/sfx', {recursive: true});
writeFileSync('public/sfx/tick.wav', wav(tick(1100)));
writeFileSync('public/sfx/tick-high.wav', wav(tick(1600)));
writeFileSync('public/sfx/reveal.wav', wav(reveal));
writeFileSync('public/sfx/whoosh.wav', wav(whoosh));
console.log('Wrote public/sfx/*.wav');
