import React, {useMemo} from 'react';
import {AbsoluteFill, Easing, Html5Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {cameraForBox, lerpCamera} from '../../shared/geo/camera';
import {type SpotRoundPlan, spotAnswer, spotPlan} from '../../shared/spot';
import {RT, ST, spotOutroStart, spotRoundFrames, spotRoundStart, spotThink} from '../../shared/timeline';
import type {BBox, VideoProps} from '../../shared/types';
import {Countdown} from '../components/Countdown';
import {Intro} from '../components/Intro';
import {SpotMap} from '../components/SpotMap';
import {fontFamily, useTheme} from '../theme';
import {STAGE_LAYOUT} from './Rapid';
import {ScoreOutro} from './ScoreOutro';

/** "What's wrong with this map?" — one country per round is drawn bigger than it really is. */
export const SpotVideo: React.FC<{video: VideoProps}> = ({video}) => {
  const plan = useMemo(() => spotPlan(video), [video]);
  const n = plan.length;
  const title = `${video.spot?.title || "What's wrong with this map?"}${video.episode ? ` #${video.episode}` : ''}`;

  return (
    <>
      {video.intro ? (
        <Sequence durationInFrames={RT.intro} name="Intro">
          <Intro video={video} title={title} subtitle={`${n} MAPS · ${video.spot?.seconds ?? 6} SECONDS EACH`} bg="" />
        </Sequence>
      ) : null}
      {plan.map((p, i) => (
        <Sequence key={i} from={spotRoundStart(video, i)} durationInFrames={spotRoundFrames(video)} name={`Map ${i + 1}`}>
          <SpotRound video={video} plan={p} total={n} fromView={i === 0 ? p.view : plan[i - 1].view} />
        </Sequence>
      ))}
      <Sequence from={spotOutroStart(video)} name="Outro">
        <ScoreOutro video={video} question="How many did you spot?" answers={plan.map((p) => `${p.label} ×${p.scale}`)} />
      </Sequence>
    </>
  );
};

const SpotRound: React.FC<{video: VideoProps; plan: SpotRoundPlan; total: number; fromView: BBox}> = ({video, plan, total, fromView}) => {
  const {COLORS} = useTheme();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const L = STAGE_LAYOUT;
  const {stage, timer} = L;
  const think = spotThink(video);
  const revealStart = ST.enter + think;

  const camT = interpolate(frame, [0, ST.enter], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
  const camera = useMemo(
    () => lerpCamera(cameraForBox(fromView, stage.w, stage.h), cameraForBox(plan.view, stage.w, stage.h), camT),
    [fromView, plan.view, camT, stage.w, stage.h],
  );
  // flash first, then shrink back to the true size
  const highlight = interpolate(frame, [revealStart, revealStart + 6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const k = interpolate(frame, [revealStart + 14, revealStart + 38], [plan.scale, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });
  const banner = spring({frame: frame - revealStart - 4, fps, config: {damping: 12, stiffness: 180}});
  const sfx = video.sfxVolume;
  const seconds = Math.round(think / fps);

  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', top: L.header.y, left: 0, right: 0, textAlign: 'center', fontFamily, color: COLORS.text}}>
        <div style={{display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 18}}>
          {Array.from({length: total}, (_, i) => (
            <div
              key={i}
              style={{
                width: i === plan.index ? 70 : 34,
                height: 12,
                borderRadius: 6,
                background: i < plan.index ? COLORS.correct : i === plan.index ? COLORS.accent : 'rgba(255,255,255,0.25)',
              }}
            />
          ))}
        </div>
        <div style={{fontSize: 34, fontWeight: 800, letterSpacing: 6, color: COLORS.accent}}>
          MAP {plan.index + 1} / {total}
        </div>
        <div style={{fontSize: 62, fontWeight: 900, marginTop: 4, textShadow: '0 4px 20px rgba(0,0,0,0.5)'}}>
          {video.spot?.title || "What's wrong with this map?"}
        </div>
      </div>

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
        }}
      >
        <SpotMap
          camera={camera}
          width={stage.w}
          height={stage.h}
          country={plan.country}
          center={plan.center}
          k={k}
          highlight={highlight}
          frame={frame}
        />
      </div>

      <div style={{position: 'absolute', left: timer.cx - timer.r - 10, top: timer.cy - timer.r - 10}}>
        <Countdown frame={frame - ST.enter} totalFrames={think} fps={fps} radius={timer.r} revealed={frame >= revealStart} />
      </div>

      {frame >= revealStart ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: L.answerY, display: 'flex', justifyContent: 'center', transform: `scale(${banner})`}}>
          <div
            style={{
              background: COLORS.correct,
              color: '#05200F',
              fontFamily,
              fontWeight: 900,
              fontSize: 54,
              padding: '16px 44px',
              borderRadius: 60,
              boxShadow: '0 10px 40px rgba(46,224,123,0.45)',
              maxWidth: 1000,
              textAlign: 'center',
            }}
          >
            {spotAnswer(plan)}
          </div>
        </div>
      ) : (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: L.answerY + 14,
            textAlign: 'center',
            fontFamily,
            fontWeight: 800,
            fontSize: 42,
            color: COLORS.muted,
          }}
        >
          One country is too big… which one?
        </div>
      )}

      {plan.index > 0 ? <Html5Audio src={staticFile('sfx/whoosh.wav')} volume={sfx * 0.5} /> : null}
      {Array.from({length: seconds}, (_, s) => (
        <Sequence key={s} from={ST.enter + s * fps} durationInFrames={Math.round(fps / 2)} layout="none">
          <Html5Audio src={staticFile(seconds - s <= 3 ? 'sfx/tick-high.wav' : 'sfx/tick.wav')} volume={sfx} />
        </Sequence>
      ))}
      <Sequence from={revealStart} layout="none">
        <Html5Audio src={staticFile('sfx/reveal.wav')} volume={sfx} />
      </Sequence>
    </AbsoluteFill>
  );
};
