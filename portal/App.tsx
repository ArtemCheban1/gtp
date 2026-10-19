import React, {useEffect, useMemo, useState} from 'react';
import {Player} from '@remotion/player';
import {GuessThePlace} from '../remotion/GuessThePlace';
import {DEFAULT_PROPS} from '../shared/defaults';
import {buildPlan} from '../shared/rounds';
import {defaultRapid} from '../shared/rapid';
import {FPS, HEIGHT, WIDTH, videoFrames} from '../shared/timeline';
import type {VideoFormat, VideoProps} from '../shared/types';
import {CaptionPanel} from './components/CaptionPanel';
import {DecoyEditor} from './components/DecoyEditor';
import {DEFAULT_PAN, PanEditor} from './components/PanEditor';
import {PhotoFinder} from './components/PhotoFinder';
import {PhotoSlots} from './components/PhotoSlots';
import {PlacePicker} from './components/PlacePicker';
import {ProjectBar} from './components/ProjectBar';
import {QueuePanel} from './components/QueuePanel';
import {RapidEditor, rapidPhotoTargets, withRapidPhoto} from './components/RapidEditor';
import {RenderPanel} from './components/RenderPanel';
import {SettingsPanel} from './components/SettingsPanel';
import {VoicePanel} from './components/VoicePanel';

const DRAFT_KEY = 'gtp:draft';

const FORMATS: {id: VideoFormat; name: string; hint: string}[] = [
  {id: 'classic', name: '3 rounds', hint: '3 photos: part of the world → region → exact place'},
  {id: 'rapid', name: 'Rapid', hint: '5–10 quick rounds: name the country on the map (or a photo)'},
  {id: 'pan', name: 'City pan', hint: 'One photo slowly panned: “Do you know this city?”'},
];

/** Why this project can't be rendered yet (null = ready). */
function formatError(props: VideoProps, classicPlanError: string | null): string | null {
  if (props.format === 'rapid') {
    const rounds = props.rapid?.rounds ?? [];
    if (!rounds.length) return 'Add some rounds';
    const i = rounds.findIndex((r) => r.kind === 'photo' && (!r.src || !r.answer.trim()));
    return i >= 0 ? `Round ${i + 1} needs a photo and an answer` : null;
  }
  if (props.format === 'pan') return props.place.name.trim() ? null : 'Pick the place first';
  return classicPlanError;
}

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
  const duration = videoFrames(props);
  const format = props.format ?? 'classic';
  const notReady = formatError(props, 'error' in plan ? plan.error : null);
  const setFormat = (f: VideoFormat) =>
    update({
      format: f,
      rapid: f === 'rapid' ? props.rapid ?? defaultRapid(props.seed) : props.rapid,
      pan: f === 'pan' ? props.pan ?? DEFAULT_PAN : props.pan,
    });
  const photoTargets = format === 'rapid' ? rapidPhotoTargets(props.rapid) : null;

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
          <section className="card">
            <div className="row tight">
              {FORMATS.map((f) => (
                <button key={f.id} className={format === f.id ? 'primary' : ''} onClick={() => setFormat(f.id)} title={f.hint}>
                  {f.name}
                </button>
              ))}
            </div>
            <small className="hint">{FORMATS.find((f) => f.id === format)!.hint}</small>
          </section>

          {format === 'rapid' ? (
            <>
              <RapidEditor props={props} update={update} />
              {photoTargets?.length ? (
                <PhotoFinder
                  place={props.place}
                  targets={photoTargets}
                  onUse={(i, slot) => setProps((p) => withRapidPhoto(p, photoTargets[i].index, slot))}
                />
              ) : null}
            </>
          ) : (
            <>
              <PlacePicker props={props} plan={plan} update={update} />
              <PhotoSlots
                photos={props.photos}
                count={format === 'pan' ? 1 : 3}
                onChange={(fn) => setProps((p) => ({...p, photos: fn(p.photos)}))}
              />
              <PhotoFinder
                place={props.place}
                targets={format === 'pan' ? [{label: 'Use', title: 'Use this photo'}] : undefined}
                onUse={(i, slot) =>
                  setProps((p) => ({...p, photos: p.photos.map((x, j) => (j === i ? {...x, ...slot, focus: undefined} : x)) as VideoProps['photos']}))
                }
              />
            </>
          )}
          {format === 'classic' ? <DecoyEditor props={props} plan={plan} update={update} /> : null}
          {format === 'pan' ? <PanEditor props={props} update={update} /> : null}
          <SettingsPanel props={props} update={update} />
          {format === 'classic' ? <VoicePanel props={props} plan={plan} update={update} /> : null}
          <QueuePanel />
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
          {notReady ? <p className="error">{notReady}</p> : null}
          <RenderPanel props={props} disabled={!!notReady} />
          <CaptionPanel props={props} update={update} />
        </aside>
      </main>
    </div>
  );
};
