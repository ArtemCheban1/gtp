import React, {useState} from 'react';
import type {VideoProps} from '../../shared/types';
import {uploadFile} from '../api';

type Props = {
  props: VideoProps;
  update: (patch: Partial<VideoProps>) => void;
};

export const SettingsPanel: React.FC<Props> = ({props, update}) => {
  const [busy, setBusy] = useState(false);
  const setText = (k: keyof VideoProps['texts'], v: string) => update({texts: {...props.texts, [k]: v}});

  const uploadMusic = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      update({music: {src: await uploadFile(file), volume: props.music?.volume ?? 0.35}});
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card">
      <h2>4 · Timing, sound &amp; text</h2>
      <div className="grid2">
        <label>
          Thinking time per round: <b>{props.thinkSeconds} s</b>
          <input
            type="range"
            min={3}
            max={10}
            value={props.thinkSeconds}
            onChange={(e) => update({thinkSeconds: Number(e.target.value)})}
          />
        </label>
        <label>
          Ticking &amp; chime volume: <b>{Math.round(props.sfxVolume * 100)}%</b>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={props.sfxVolume}
            onChange={(e) => update({sfxVolume: Number(e.target.value)})}
          />
        </label>
        <label>
          Background music (your own royalty-free track)
          <input type="file" accept="audio/*" onChange={(e) => uploadMusic(e.target.files?.[0])} disabled={busy} />
          {props.music ? (
            <span className="row tight">
              <small>{props.music.src.split('/').pop()}</small>
              <button onClick={() => update({music: null})}>Remove</button>
            </span>
          ) : null}
        </label>
        <label>
          Music volume: <b>{Math.round((props.music?.volume ?? 0) * 100)}%</b>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            disabled={!props.music}
            value={props.music?.volume ?? 0}
            onChange={(e) => props.music && update({music: {...props.music, volume: Number(e.target.value)}})}
          />
        </label>
      </div>
      <div className="grid2">
        <label>
          Intro title
          <input value={props.texts.title} onChange={(e) => setText('title', e.target.value)} />
        </label>
        <label>
          Ending question
          <input value={props.texts.cta} onChange={(e) => setText('cta', e.target.value)} />
        </label>
        <label className="span2">
          Follow line
          <input value={props.texts.follow} onChange={(e) => setText('follow', e.target.value)} />
        </label>
      </div>
    </section>
  );
};
