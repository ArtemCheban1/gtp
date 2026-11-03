import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Player} from '@remotion/player';
import {GuessThePlace} from '../remotion/GuessThePlace';
import {DEFAULT_PROPS} from '../shared/defaults';
import {buildPlan} from '../shared/rounds';
import {defaultRapid} from '../shared/rapid';
import {defaultOutline} from '../shared/outline';
import {defaultSpot} from '../shared/spot';
import {defaultVersus} from '../shared/versus';
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
import {SpotEditor} from './components/SpotEditor';
import {OutlineEditor} from './components/OutlineEditor';
import {VersusEditor} from './components/VersusEditor';
import {VoicePanel} from './components/VoicePanel';
import {type MusicTrack, listMusic} from './api';
import {loadAutoLook, randomLook, saveAutoLook} from './look';

const DRAFT_KEY = 'gtp:draft';

const FORMATS: {id: VideoFormat; name: string; hint: string}[] = [
  {id: 'classic', name: '3 rounds', hint: '3 photos: part of the world → region → exact place'},
  {id: 'rapid', name: 'Rapid', hint: '5–10 quick rounds: name the country on the map (or a photo)'},
  {id: 'pan', name: 'City pan', hint: 'One photo slowly panned: “Do you know this city?”'},
  {id: 'spot', name: "What's wrong?", hint: 'One country per map is drawn too big — spot it before the timer ends'},
  {id: 'outline', name: 'Before 100%', hint: 'A country outline draws itself — name it before it is complete'},
  {id: 'versus', name: 'Which is bigger?', hint: 'Two countries: which is bigger / farther north? Tricky pairs picked automatically'},
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
  if (props.format === 'spot') return props.spot?.rounds.length ? null : 'Add some maps';
  if (props.format === 'outline') return props.outline?.rounds.length ? null : 'Add some countries';
  if (props.format === 'versus') return props.versus?.rounds.length ? null : 'Add some match-ups';
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

  // Music library + "new look" (random theme / caption style / track) for every new place or new set
  const [library, setLibrary] = useState<MusicTrack[]>([]);
  const refreshLibrary = useCallback(() => {
    listMusic()
      .then(setLibrary)
      .catch(() => setLibrary([]));
  }, []);
  useEffect(refreshLibrary, [refreshLibrary]);
  const [autoLook, setAutoLookState] = useState(loadAutoLook);
  const setAutoLook = (on: boolean) => {
    setAutoLookState(on);
    saveAutoLook(on);
  };
  const urls = library.map((t) => t.url);
  const shuffleLook = () => setProps((p) => ({...p, ...randomLook(p, urls)}));
  /** Editors call this after new content (new place, new countries, new maps) */
  const newContent = () => {
    if (autoLook) shuffleLook();
  };

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
      spot: f === 'spot' ? props.spot ?? defaultSpot(props.seed) : props.spot,
      outline: f === 'outline' ? props.outline ?? defaultOutline(props.seed) : props.outline,
      versus: f === 'versus' ? props.versus ?? defaultVersus(props.seed) : props.versus,
    });
  const photoTargets = format === 'rapid' ? rapidPhotoTargets(props.rapid) : null;

  return (
    <div className="app">
      <header className="topbar">
        <h1>
          Guess the <span>Place</span> <small>reel studio</small>
        </h1>
        <ProjectBar
          props={props}
          onLoad={setProps}
          onNew={() =>
            setProps((p) => {
              const fresh: VideoProps = {...DEFAULT_PROPS, format: p.format, seed: Date.now() % 100000};
              const withFormat: VideoProps = {
                ...fresh,
                rapid: fresh.format === 'rapid' ? defaultRapid(fresh.seed) : undefined,
                pan: fresh.format === 'pan' ? DEFAULT_PAN : undefined,
                spot: fresh.format === 'spot' ? defaultSpot(fresh.seed) : undefined,
                outline: fresh.format === 'outline' ? defaultOutline(fresh.seed) : undefined,
                versus: fresh.format === 'versus' ? defaultVersus(fresh.seed) : undefined,
                music: p.music,
              };
              return autoLook ? {...withFormat, ...randomLook(withFormat, urls)} : withFormat;
            })
          }
        />
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

          {format === 'spot' ? (
            <SpotEditor props={props} update={update} onNewContent={newContent} />
          ) : format === 'outline' ? (
            <OutlineEditor props={props} update={update} onNewContent={newContent} />
          ) : format === 'versus' ? (
            <VersusEditor props={props} update={update} onNewContent={newContent} />
          ) : format === 'rapid' ? (
            <>
              <RapidEditor props={props} update={update} onNewContent={newContent} />
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
              <PlacePicker props={props} plan={plan} update={update} onNewContent={newContent} />
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
          <SettingsPanel
            props={props}
            update={update}
            library={library}
            onLibraryChange={refreshLibrary}
            autoLook={autoLook}
            setAutoLook={setAutoLook}
            shuffleLook={shuffleLook}
          />
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
