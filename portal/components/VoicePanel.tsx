import React, {useEffect, useState} from 'react';
import type {Plan} from '../../shared/rounds';
import type {VideoProps, VoiceClip} from '../../shared/types';
import {generateVoice, uploadFile, voiceEngine} from '../api';

type Props = {
  props: VideoProps;
  plan: Plan;
  update: (patch: Partial<VideoProps>) => void;
};

/** Optional "It's Oceania!" voice-over on each reveal: text-to-speech or your own recordings. */
export const VoicePanel: React.FC<Props> = ({props, plan, update}) => {
  const [engine, setEngine] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    voiceEngine()
      .then((r) => setEngine(r.engine))
      .catch(() => setEngine(null));
  }, []);

  const voice = props.voice ?? {clips: [null, null, null], volume: 1};
  const expected = 'error' in plan ? [] : plan.rounds.map((r) => `It's ${r.answerLabel}!`);
  const setClip = (i: number, clip: VoiceClip | null) => {
    const clips = [0, 1, 2].map((j) => (j === i ? clip : voice.clips[j] ?? null));
    update({voice: {...voice, clips}});
  };

  const generate = async () => {
    setBusy(true);
    setError('');
    try {
      const {clips} = await generateVoice(props);
      update({voice: {...voice, clips}});
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const record = async (i: number, file?: File) => {
    if (!file) return;
    try {
      setClip(i, {text: expected[i] ?? '', src: await uploadFile(file)});
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <section className="card">
      <h2>Voice-over (optional)</h2>
      <p className="hint">
        A voice says the answer on each reveal.{' '}
        {engine
          ? `Generated with ${engine}.`
          : engine === null
            ? 'No text-to-speech engine is set up (see server/voice.ts) — upload your own recordings instead.'
            : ''}
      </p>
      <div className="row tight">
        <button className="primary" onClick={generate} disabled={!engine || busy || 'error' in plan}>
          {busy ? 'Generating…' : 'Generate voice'}
        </button>
        {props.voice ? <button onClick={() => update({voice: undefined})}>Remove voice-over</button> : null}
      </div>
      <ul className="voice-lines">
        {expected.map((line, i) => {
          const clip = voice.clips[i];
          return (
            <li key={i}>
              <b>Round {i + 1}:</b> “{line}”{' '}
              {clip ? (
                <>
                  <audio src={clip.src} controls preload="none" />
                  {clip.text && clip.text !== line ? <span className="error"> says “{clip.text}” — regenerate</span> : null}
                  <button onClick={() => setClip(i, null)}>✕</button>
                </>
              ) : (
                <small className="hint">silent</small>
              )}
              <label className="upload-link">
                upload recording
                <input type="file" accept="audio/*" hidden onChange={(e) => record(i, e.target.files?.[0])} />
              </label>
            </li>
          );
        })}
      </ul>
      {props.voice ? (
        <label>
          Voice volume: <b>{Math.round(voice.volume * 100)}%</b>
          <input
            type="range"
            min={0}
            max={1.5}
            step={0.05}
            value={voice.volume}
            onChange={(e) => update({voice: {...voice, volume: Number(e.target.value)}})}
          />
        </label>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
};
