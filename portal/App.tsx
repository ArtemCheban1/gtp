import React, {useEffect, useMemo, useState} from 'react';
import {Player} from '@remotion/player';
import {GuessThePlace} from '../remotion/GuessThePlace';
import {DEFAULT_PROPS} from '../shared/defaults';
import {buildPlan} from '../shared/rounds';
import {FPS, HEIGHT, WIDTH, totalFrames} from '../shared/timeline';
import type {VideoProps} from '../shared/types';
import {DecoyEditor} from './components/DecoyEditor';
import {PhotoSlots} from './components/PhotoSlots';
import {PlacePicker} from './components/PlacePicker';
import {ProjectBar} from './components/ProjectBar';
import {RenderPanel} from './components/RenderPanel';
import {SettingsPanel} from './components/SettingsPanel';

const DRAFT_KEY = 'gtp:draft';

function loadDraft(): VideoProps {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) return {...DEFAULT_PROPS, ...JSON.parse(raw)};
  } catch {
    // ignore broken drafts
  }
  return DEFAULT_PROPS;
}

export const App: React.FC = () => {
  const [props, setProps] = useState<VideoProps>(loadDraft);
  const update = (patch: Partial<VideoProps>) => setProps((p) => ({...p, ...patch}));

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(props));
    } catch {
      // storage full / private mode — the draft just isn't remembered
    }
  }, [props]);

  const plan = useMemo(() => buildPlan(props), [props]);
  const duration = totalFrames(props);

  return (
    <div className="app">
      <header className="topbar">
        <h1>
          Guess the <span>Place</span> <small>reel studio</small>
        </h1>
        <ProjectBar props={props} onLoad={setProps} onNew={() => setProps({...DEFAULT_PROPS, seed: Date.now() % 100000})} />
      </header>

      <main className="layout">
        <div className="editor">
          <PlacePicker props={props} plan={plan} update={update} />
          <PhotoSlots photos={props.photos} onChange={(fn) => setProps((p) => ({...p, photos: fn(p.photos)}))} />
          <DecoyEditor props={props} plan={plan} update={update} />
          <SettingsPanel props={props} update={update} />
        </div>

        <aside className="preview">
          <div className="player-wrap">
            <Player
              component={GuessThePlace}
              inputProps={props}
              durationInFrames={duration}
              compositionWidth={WIDTH}
              compositionHeight={HEIGHT}
              fps={FPS}
              controls
              acknowledgeRemotionLicense
              style={{width: '100%', aspectRatio: `${WIDTH} / ${HEIGHT}`, borderRadius: 16, overflow: 'hidden'}}
            />
          </div>
          <p className="hint">{(duration / FPS).toFixed(1)} s · 1080×1920 · 30 fps</p>
          <RenderPanel props={props} disabled={'error' in plan} />
        </aside>
      </main>
    </div>
  );
};
