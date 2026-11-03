import React, {useMemo} from 'react';
import {AbsoluteFill, Easing, Html5Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {cameraForBox} from '../../shared/geo/camera';
import {countryInfo} from '../../shared/geo/countries';
import {type OutlineRoundPlan, outlinePlan} from '../../shared/outline';
import {countryMapSpec} from '../../shared/rapid';
import {OT, RT, outlineOutroStart, outlineRoundFrames, outlineRoundStart, outlineThink} from '../../shared/timeline';
import type {VideoProps} from '../../shared/types';
import {CountryShape} from '../components/CountryShape';
import {Intro} from '../components/Intro';
import {MapView} from '../components/MapView';
import {fontFamily, useTheme} from '../theme';
import {STAGE_LAYOUT} from './Rapid';
import {ScoreOutro} from './ScoreOutro';

/** "Guess before 100%": the outline draws itself during the thinking time; name the country before it's done. */
export const OutlineVideo: React.FC<{video: VideoProps}> = ({video}) => {
  const plan = useMemo(() => outlinePlan(video), [video]);
  const title = `${video.outline?.title || 'Guess before 100%'}${video.episode ? ` #${video.episode}` : ''}`;
  return (
    <>
      {video.intro ? (
        <Sequence durationInFrames={RT.intro} name="Intro">
          <Intro video={video} title={title} subtitle={`${plan.length} COUNTRIES · GUESS BEFORE 100%`} bg="" />
        </Sequence>
      ) : null}
      {plan.map((p, i) => (
        <Sequence key={i} from={outlineRoundStart(video, i)} durationInFrames={outlineRoundFrames(video)} name={`Outline ${i + 1}`}>
          <OutlineRound video={video} plan={p} total={plan.length} />
        </Sequence>
      ))}
      <Sequence from={outlineOutroStart(video)} name="Outro">
        <ScoreOutro video={video} question="How many did you get before 100%?" answers={plan.map((p) => p.label)} />
      </Sequence>
    </>
  );
};

const OutlineRound: React.FC<{video: VideoProps; plan: OutlineRoundPlan; total: number}> = ({video, plan, total}) => {
  const {COLORS} = useTheme();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const L = STAGE_LAYOUT;
  const {stage} = L;
  const think = outlineThink(video);
  const revealStart = OT.enter + think;
  // the outline speeds up a little at the end — the last % are the giveaway
  const progress = interpolate(frame, [OT.enter, revealStart], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.quad)});
  const fill = interpolate(frame, [revealStart, revealStart + 10], [0, 0.9], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const banner = spring({frame: frame - revealStart - 2, fps, config: {damping: 12, stiffness: 180}});
  const inset = spring({frame: frame - revealStart - 10, fps, config: {damping: 16, stiffness: 140}});
  const info = countryInfo(plan.country);
  const locator = useMemo(() => (info ? countryMapSpec(info).spec : null), [info]);
  const sfx = video.sfxVolume;
  const pct = Math.round(progress * 100);
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
          COUNTRY {plan.index + 1} / {total}
        </div>
        <div style={{fontSize: 66, fontWeight: 900, marginTop: 4, textShadow: '0 4px 20px rgba(0,0,0,0.5)'}}>Guess before 100%</div>
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
          background: `radial-gradient(circle at 50% 45%, ${COLORS.bg2}, ${COLORS.bg})`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
          border: `2px solid rgba(255,255,255,0.08)`,
        }}
      >
        <CountryShape country={plan.country} width={stage.w} height={stage.h} progress={progress} fill={fill} color={COLORS.accent} padding={110} />
        {/* % counter */}
        <div
          style={{
            position: 'absolute',
            top: 28,
            right: 36,
            fontFamily,
            fontWeight: 900,
            fontSize: 72,
            color: frame >= revealStart ? COLORS.correct : pct >= 80 ? COLORS.danger : COLORS.text,
          }}
        >
          {pct}%
        </div>
        {/* Where it is — small locator map after the reveal */}
        {locator && frame >= revealStart ? (
          <div
            style={{
              position: 'absolute',
              left: 28,
              bottom: 28,
              width: 380,
              height: 280,
              borderRadius: 22,
              overflow: 'hidden',
              border: '3px solid rgba(255,255,255,0.7)',
              transform: `scale(${inset})`,
              transformOrigin: 'bottom left',
            }}
          >
            <MapView camera={cameraForBox(locator.view, 380, 280)} width={380} height={280} round={locator} reveal={1} frame={frame} labelsOpacity={0} />
          </div>
        ) : null}
      </div>

      {frame >= revealStart ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: L.answerY - 40, display: 'flex', justifyContent: 'center', transform: `scale(${banner})`}}>
          <div
            style={{
              background: COLORS.correct,
              color: '#05200F',
              fontFamily,
              fontWeight: 900,
              fontSize: 60,
              padding: '16px 50px',
              borderRadius: 60,
              boxShadow: '0 10px 40px rgba(46,224,123,0.45)',
            }}
          >
            {plan.label}
          </div>
        </div>
      ) : (
        <div style={{position: 'absolute', left: 0, right: 0, top: L.answerY - 26, textAlign: 'center', fontFamily, fontWeight: 800, fontSize: 44, color: COLORS.muted}}>
          Name it before it's complete!
        </div>
      )}

      {Array.from({length: seconds}, (_, s) => (
        <Sequence key={s} from={OT.enter + s * fps} durationInFrames={Math.round(fps / 2)} layout="none">
          <Html5Audio src={staticFile(seconds - s <= 2 ? 'sfx/tick-high.wav' : 'sfx/tick.wav')} volume={sfx} />
        </Sequence>
      ))}
      <Sequence from={revealStart} layout="none">
        <Html5Audio src={staticFile('sfx/reveal.wav')} volume={sfx} />
      </Sequence>
    </AbsoluteFill>
  );
};
