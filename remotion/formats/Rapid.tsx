import React, {useMemo} from 'react';
import {
  AbsoluteFill,
  Easing,
  Html5Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {cameraForBox, lerpCamera} from '../../shared/geo/camera';
import {WORLD_VIEW} from '../../shared/geo/regions';
import {type RapidRoundPlan, rapidPlan} from '../../shared/rapid';
import {RT, rapidOutroStart, rapidRoundFrames, rapidRoundStart, rapidThink} from '../../shared/timeline';
import type {BBox, VideoProps} from '../../shared/types';
import {Countdown} from '../components/Countdown';
import {Intro} from '../components/Intro';
import {MapView} from '../components/MapView';
import {Photo} from '../components/Photo';
import {fontFamily, useTheme} from '../theme';

/** Rapid layout: big map/photo, timer on its bottom edge, answer under it — all above y=1600. */
const L = {
  header: {y: 70},
  stage: {x: 40, y: 290, w: 1000, h: 1060},
  timer: {cx: 540, cy: 1350, r: 70},
  answerY: 1450,
};

export const RapidVideo: React.FC<{video: VideoProps}> = ({video}) => {
  const plan = useMemo(() => rapidPlan(video), [video]);
  const n = plan.length;
  const title = `${video.rapid?.title || 'Guess the Country'}${video.episode ? ` #${video.episode}` : ''}`;
  const firstPhoto = plan.find((p) => p.round.kind === 'photo')?.round;

  return (
    <>
      {video.intro ? (
      <Sequence durationInFrames={RT.intro} name="Intro">
        <Intro
          video={video}
          title={title}
          subtitle={`${n} ROUNDS · ${video.rapid?.seconds ?? 3} SECONDS EACH`}
          bg={firstPhoto && 'src' in firstPhoto ? firstPhoto.src : ''}
        />
      </Sequence>
      ) : null}
      {plan.map((p, i) => (
        <Sequence key={i} from={rapidRoundStart(video, i)} durationInFrames={rapidRoundFrames(video)} name={`Round ${i + 1}`}>
          <RapidRound video={video} plan={p} total={n} fromView={i === 0 && !video.intro ? p.view : i === 0 ? WORLD_VIEW : plan[i - 1].view} instant={i === 0 && !video.intro} />
        </Sequence>
      ))}
      <Sequence from={rapidOutroStart(video)} name="Outro">
        <RapidOutro video={video} plan={plan} />
      </Sequence>
    </>
  );
};

const RapidRound: React.FC<{video: VideoProps; plan: RapidRoundPlan; total: number; fromView: BBox; instant: boolean}> = ({video, plan, total, fromView, instant}) => {
  const {COLORS} = useTheme();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const think = rapidThink(video);
  const revealStart = RT.enter + think;
  const {stage, timer} = L;
  const {round, spec} = plan;

  const camT = interpolate(frame, [0, RT.enter], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
  const camera = useMemo(
    () => lerpCamera(cameraForBox(fromView, stage.w, stage.h), cameraForBox(plan.view, stage.w, stage.h), camT),
    [fromView, plan.view, camT, stage.w, stage.h],
  );
  const reveal = interpolate(frame, [revealStart, revealStart + 8], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const banner = spring({frame: frame - revealStart - 2, fps, config: {damping: 12, stiffness: 180}});
  const enter = instant ? 1 : spring({frame, fps, config: {damping: 200}, durationInFrames: RT.enter});
  const sfx = video.sfxVolume;
  const seconds = Math.round(think / fps);

  return (
    <AbsoluteFill>
      {/* Header: progress dots + round counter + question */}
      <div style={{position: 'absolute', top: L.header.y, left: 0, right: 0, textAlign: 'center', fontFamily, color: COLORS.text}}>
        <div style={{display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 18}}>
          {Array.from({length: total}, (_, i) => (
            <div
              key={i}
              style={{
                width: i === plan.index ? 54 : 26,
                height: 12,
                borderRadius: 6,
                background: i < plan.index ? COLORS.correct : i === plan.index ? COLORS.accent : 'rgba(255,255,255,0.25)',
              }}
            />
          ))}
        </div>
        <div style={{fontSize: 34, fontWeight: 800, letterSpacing: 6, color: COLORS.accent}}>
          ROUND {plan.index + 1} / {total}
        </div>
        <div style={{fontSize: 70, fontWeight: 900, marginTop: 4, textShadow: '0 4px 20px rgba(0,0,0,0.5)'}}>
          {round.kind === 'country' ? 'Name this country' : 'Where is this?'}
        </div>
      </div>

      {/* Stage: map with the country highlighted, or the photo */}
      <div
        style={{
          position: 'absolute',
          left: stage.x,
          top: stage.y,
          width: stage.w,
          height: stage.h,
          borderRadius: 36,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
          transform: round.kind === 'photo' ? `translateX(${(1 - enter) * 1100}px)` : undefined,
        }}
      >
        {round.kind === 'photo' ? (
          <Photo
            src={round.src}
            focus={round.focus}
            width={stage.w}
            height={stage.h}
            radius={0}
            zoom={interpolate(frame, [0, revealStart + RT.reveal], [1, 1.06])}
            label="PHOTO"
          />
        ) : spec ? (
          <MapView camera={camera} width={stage.w} height={stage.h} round={spec} reveal={reveal} frame={frame} labelsOpacity={reveal} />
        ) : null}
      </div>

      <div style={{position: 'absolute', left: timer.cx - timer.r - 10, top: timer.cy - timer.r - 10}}>
        <Countdown frame={frame - RT.enter} totalFrames={think} fps={fps} radius={timer.r} revealed={frame >= revealStart} />
      </div>

      {frame >= revealStart ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: L.answerY, display: 'flex', justifyContent: 'center', transform: `scale(${banner})`}}>
          <div
            style={{
              background: COLORS.correct,
              color: '#05200F',
              fontFamily,
              fontWeight: 900,
              fontSize: 56,
              padding: '16px 46px',
              borderRadius: 60,
              boxShadow: '0 10px 40px rgba(46,224,123,0.45)',
              maxWidth: 980,
              textAlign: 'center',
            }}
          >
            {plan.label}
          </div>
        </div>
      ) : null}

      {plan.index > 0 ? <Html5Audio src={staticFile('sfx/whoosh.wav')} volume={sfx * 0.5} /> : null}
      {Array.from({length: seconds}, (_, s) => (
        <Sequence key={s} from={RT.enter + s * fps} durationInFrames={Math.round(fps / 2)} layout="none">
          <Html5Audio src={staticFile(seconds - s <= 1 ? 'sfx/tick-high.wav' : 'sfx/tick.wav')} volume={sfx} />
        </Sequence>
      ))}
      <Sequence from={revealStart} layout="none">
        <Html5Audio src={staticFile('sfx/reveal.wav')} volume={sfx} />
      </Sequence>
    </AbsoluteFill>
  );
};

/** Score screen: all answers at a glance (people pause here) + score prompt. */
const RapidOutro: React.FC<{video: VideoProps; plan: RapidRoundPlan[]}> = ({video, plan}) => {
  const {COLORS} = useTheme();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = (delay: number, damping = 14) => spring({frame: frame - delay, fps, config: {damping, stiffness: 150}});
  const bg = plan.find((p) => p.round.kind === 'photo')?.round;
  const two = plan.length > 5;

  return (
    <AbsoluteFill style={{fontFamily, color: COLORS.text, textAlign: 'center'}}>
      {bg && 'src' in bg && bg.src ? (
        <Img
          src={bg.src}
          style={{position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(36px) brightness(0.35)', transform: 'scale(1.2)'}}
        />
      ) : null}
      <div style={{position: 'absolute', top: 150, left: 0, right: 0}}>
        <div style={{fontSize: 52, fontWeight: 800, color: COLORS.muted, opacity: s(0)}}>How many did you get?</div>
        <div style={{fontSize: 170, fontWeight: 900, lineHeight: 1.05, color: COLORS.accent, transform: `scale(${s(5, 10)})`}}>?/{plan.length}</div>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 520,
          left: 70,
          right: 70,
          display: 'grid',
          gridTemplateColumns: two ? '1fr 1fr' : '1fr',
          gap: '18px 24px',
        }}
      >
        {plan.map((p, i) => (
          <div
            key={i}
            style={{
              opacity: s(14 + i * 3),
              transform: `translateY(${(1 - s(14 + i * 3)) * 60}px)`,
              background: 'rgba(8,16,26,0.75)',
              border: `3px solid ${COLORS.correct}`,
              borderRadius: 40,
              padding: '12px 22px',
              fontSize: 36,
              fontWeight: 800,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            <span style={{color: COLORS.correct}}>{i + 1}.</span> {p.label}
          </div>
        ))}
      </div>
      <div style={{position: 'absolute', top: 1340, left: 60, right: 60, opacity: s(45, 200)}}>
        <div style={{fontSize: 50, fontWeight: 900}}>Comment your score 👇</div>
        <div style={{fontSize: 40, fontWeight: 800, color: COLORS.accent, marginTop: 20}}>{video.texts.follow}</div>
      </div>
      <Html5Audio src={staticFile('sfx/whoosh.wav')} volume={video.sfxVolume * 0.7} />
    </AbsoluteFill>
  );
};
