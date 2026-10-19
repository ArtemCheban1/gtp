import React, {useMemo} from 'react';
import {AbsoluteFill, Html5Audio, Sequence, interpolate, useVideoConfig} from 'remotion';
import {buildPlan} from '../shared/rounds';
import {T, outroStart, roundFrames, roundStart} from '../shared/timeline';
import {WORLD_VIEW} from '../shared/geo/regions';
import type {VideoProps} from '../shared/types';
import {Intro} from './components/Intro';
import {Outro} from './components/Outro';
import {Round} from './components/Round';
import {PanVideo} from './formats/Pan';
import {RapidVideo} from './formats/Rapid';
import {ThemeProvider, fontFamily, themeFor, useTheme} from './theme';

export const GuessThePlace: React.FC<VideoProps> = (video) => (
  <ThemeProvider value={themeFor(video.theme)}>
    {video.format === 'rapid' || video.format === 'pan' ? <OtherFormat {...video} /> : <Reel {...video} />}
  </ThemeProvider>
);

/** Rapid / pan formats share the background and the music bed with the classic reel. */
const OtherFormat: React.FC<VideoProps> = (video) => {
  const {COLORS} = useTheme();
  return (
    <AbsoluteFill style={{background: `radial-gradient(circle at 50% 30%, ${COLORS.bg2}, ${COLORS.bg})`}}>
      {video.format === 'rapid' ? <RapidVideo video={video} /> : <PanVideo video={video} />}
      <Music video={video} />
    </AbsoluteFill>
  );
};

const Music: React.FC<{video: VideoProps}> = ({video}) => {
  const {durationInFrames} = useVideoConfig();
  if (!video.music?.src) return null;
  return (
    <Html5Audio
      src={video.music.src}
      loop
      volume={(f) =>
        video.music!.volume *
        interpolate(f, [0, 15, durationInFrames - 45, durationInFrames], [0, 1, 1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      }
    />
  );
};

const Reel: React.FC<VideoProps> = (video) => {
  const {COLORS} = useTheme();
  const plan = useMemo(() => buildPlan(video), [video]);

  if ('error' in plan) {
    return (
      <AbsoluteFill style={{background: COLORS.bg, color: COLORS.danger, fontFamily, fontSize: 48, padding: 80, justifyContent: 'center'}}>
        {plan.error}
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{background: `radial-gradient(circle at 50% 30%, ${COLORS.bg2}, ${COLORS.bg})`}}>
      {video.intro ? (
        <Sequence durationInFrames={T.intro} name="Intro">
          <Intro video={video} />
        </Sequence>
      ) : null}
      {plan.rounds.map((round, i) => (
        <Sequence key={i} from={roundStart(video, i)} durationInFrames={roundFrames(video)} name={`Round ${i + 1}`}>
          <Round video={video} round={round} fromView={i === 0 ? WORLD_VIEW : plan.rounds[i - 1].view} instant={i === 0 && !video.intro} />
        </Sequence>
      ))}
      <Sequence from={outroStart(video)} name="Outro">
        <Outro video={video} rounds={plan.rounds} />
      </Sequence>
      <Music video={video} />
    </AbsoluteFill>
  );
};
