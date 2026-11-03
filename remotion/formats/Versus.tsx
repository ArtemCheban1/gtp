import React, {useMemo} from 'react';
import {AbsoluteFill, Html5Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {QUESTIONS, type VersusRoundPlan, versusAnswer, versusPlan} from '../../shared/versus';
import {RT, VT, versusOutroStart, versusRoundFrames, versusRoundStart, versusThink} from '../../shared/timeline';
import type {VideoProps} from '../../shared/types';
import {Countdown} from '../components/Countdown';
import {CountryShape} from '../components/CountryShape';
import {Intro} from '../components/Intro';
import {fontFamily, useTheme} from '../theme';
import {ScoreOutro} from './ScoreOutro';

const CARD = {x: 40, w: 1000, h: 530, topY: 280, bottomY: 880};
const TIMER = {cx: 540, cy: 845, r: 62};

/** "Which is bigger?" / "Which is farther north?" — two countries (each drawn at its own scale), pick one. */
export const VersusVideo: React.FC<{video: VideoProps}> = ({video}) => {
  const plan = useMemo(() => versusPlan(video), [video]);
  const title = `${video.versus?.title || 'Which is bigger?'}${video.episode ? ` #${video.episode}` : ''}`;
  return (
    <>
      {video.intro ? (
        <Sequence durationInFrames={RT.intro} name="Intro">
          <Intro video={video} title={title} subtitle={`${plan.length} ROUNDS · ${video.versus?.seconds ?? 5} SECONDS EACH`} bg="" />
        </Sequence>
      ) : null}
      {plan.map((p, i) => (
        <Sequence key={i} from={versusRoundStart(video, i)} durationInFrames={versusRoundFrames(video)} name={`Versus ${i + 1}`}>
          <VersusRound video={video} plan={p} total={plan.length} instant={i === 0 && !video.intro} />
        </Sequence>
      ))}
      <Sequence from={versusOutroStart(video)} name="Outro">
        <ScoreOutro video={video} question="How many did you get right?" answers={plan.map(versusAnswer)} />
      </Sequence>
    </>
  );
};

const VersusRound: React.FC<{video: VideoProps; plan: VersusRoundPlan; total: number; instant: boolean}> = ({video, plan, total, instant}) => {
  const {COLORS, OPTION_COLORS} = useTheme();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const think = versusThink(video);
  const revealStart = VT.enter + think;
  const revealed = frame >= revealStart;
  const r = interpolate(frame, [revealStart, revealStart + 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const pop = spring({frame: frame - revealStart, fps, config: {damping: 11, stiffness: 170}});
  const sfx = video.sfxVolume;
  const seconds = Math.round(think / fps);

  const card = (side: 'a' | 'b', y: number, color: string) => {
    const c = plan[side];
    const win = plan.winner === side;
    // first round of a video without a title card: cards are already there on frame 0
    const enter = instant ? 1 : spring({frame: frame - (side === 'a' ? 0 : 4), fps, config: {damping: 200}, durationInFrames: VT.enter});
    return (
      <div
        style={{
          position: 'absolute',
          left: CARD.x,
          top: y,
          width: CARD.w,
          height: CARD.h,
          borderRadius: 36,
          overflow: 'hidden',
          background: `radial-gradient(circle at 50% 40%, ${COLORS.bg2}, ${COLORS.bg})`,
          border: `5px solid ${revealed && win ? COLORS.correct : 'rgba(255,255,255,0.1)'}`,
          boxShadow: revealed && win ? `0 0 ${40 + 20 * r}px rgba(46,224,123,0.5)` : '0 20px 60px rgba(0,0,0,0.45)',
          opacity: revealed && !win ? 1 - 0.55 * r : 1,
          transform: `translateX(${(1 - enter) * (side === 'a' ? -1100 : 1100)}px) scale(${revealed && win ? 1 + 0.03 * pop : 1})`,
          fontFamily,
          color: COLORS.text,
        }}
      >
        <div style={{position: 'absolute', left: 0, top: 0, width: 600, height: CARD.h}}>
          <CountryShape country={c.name} width={600} height={CARD.h} fill={0.85} color={color} strokeWidth={4} padding={50} />
        </div>
        <div style={{position: 'absolute', left: 600, right: 30, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14}}>
          <div style={{fontSize: c.label.length > 12 ? 52 : 64, fontWeight: 900, lineHeight: 1.05}}>{c.label}</div>
          {revealed ? (
            <div style={{fontSize: 42, fontWeight: 800, color: win ? COLORS.correct : COLORS.muted, opacity: r}}>
              {win ? '✓ ' : ''}
              {c.value}
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', top: 70, left: 0, right: 0, textAlign: 'center', fontFamily, color: COLORS.text}}>
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
          ROUND {plan.index + 1} / {total}
        </div>
        <div style={{fontSize: 70, fontWeight: 900, marginTop: 4, textShadow: '0 4px 20px rgba(0,0,0,0.5)'}}>{QUESTIONS[plan.question].text}</div>
      </div>

      {card('a', CARD.topY, OPTION_COLORS.A)}
      {card('b', CARD.bottomY, OPTION_COLORS.B)}

      <div style={{position: 'absolute', left: TIMER.cx - TIMER.r - 10, top: TIMER.cy - TIMER.r - 10}}>
        <Countdown frame={frame - VT.enter} totalFrames={think} fps={fps} radius={TIMER.r} revealed={revealed} />
      </div>

      <div style={{position: 'absolute', left: 0, right: 0, top: CARD.bottomY + CARD.h + 34, textAlign: 'center', fontFamily, fontWeight: 800, fontSize: 40, color: COLORS.muted}}>
        {revealed ? 'Did you get it? 👇' : 'Shapes are not to scale 😉'}
      </div>

      {Array.from({length: seconds}, (_, s) => (
        <Sequence key={s} from={VT.enter + s * fps} durationInFrames={Math.round(fps / 2)} layout="none">
          <Html5Audio src={staticFile(seconds - s <= 3 ? 'sfx/tick-high.wav' : 'sfx/tick.wav')} volume={sfx} />
        </Sequence>
      ))}
      {plan.index > 0 ? <Html5Audio src={staticFile('sfx/whoosh.wav')} volume={sfx * 0.5} /> : null}
      <Sequence from={revealStart} layout="none">
        <Html5Audio src={staticFile('sfx/reveal.wav')} volume={sfx} />
      </Sequence>
    </AbsoluteFill>
  );
};
