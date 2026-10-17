import React, {useMemo} from 'react';
import {
  AbsoluteFill,
  Easing,
  Html5Audio,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {cameraForBox, lerpCamera} from '../../shared/geo/camera';
import {T, thinkFrames} from '../../shared/timeline';
import type {BBox, RoundSpec, VideoProps} from '../../shared/types';
import {LAYOUT, fontFamily, useTheme} from '../theme';
import {Countdown} from './Countdown';
import {MapView} from './MapView';
import {Photo} from './Photo';

type Props = {
  video: VideoProps;
  round: RoundSpec;
  /** View the map flies in from */
  fromView: BBox;
};

const {map, photo, timer} = LAYOUT;

export const Round: React.FC<Props> = ({video, round, fromView}) => {
  const {COLORS} = useTheme();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const think = thinkFrames(video);
  const revealStart = T.enter + think;

  const enter = spring({frame, fps, config: {damping: 200}, durationInFrames: T.enter});
  const camT = interpolate(frame, [0, T.enter], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });
  const camera = useMemo(
    () => lerpCamera(cameraForBox(fromView, map.w, map.h), cameraForBox(round.view, map.w, map.h), camT),
    [fromView, round.view, camT],
  );
  const reveal = interpolate(frame, [revealStart, revealStart + 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const banner = spring({frame: frame - revealStart - 4, fps, config: {damping: 12, stiffness: 160}});
  const zoom = interpolate(frame, [0, T.enter + think + T.reveal], [1, 1.08]);
  const shot = video.photos[round.index];
  const sfx = video.sfxVolume;
  const voiceClip = video.voice?.clips[round.index];

  return (
    <AbsoluteFill>
      {/* Header */}
      <div
        style={{
          position: 'absolute',
          top: LAYOUT.header.y,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily,
          color: COLORS.text,
        }}
      >
        <div style={{display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 18}}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: i === round.index ? 90 : 46,
                height: 14,
                borderRadius: 7,
                background: i < round.index ? COLORS.correct : i === round.index ? COLORS.accent : 'rgba(255,255,255,0.25)',
              }}
            />
          ))}
        </div>
        <div style={{fontSize: 34, fontWeight: 800, letterSpacing: 6, color: COLORS.accent}}>
          ROUND {round.index + 1} / 3
        </div>
        <div style={{fontSize: 66, fontWeight: 900, marginTop: 6, textShadow: '0 4px 20px rgba(0,0,0,0.5)'}}>
          {round.question}
        </div>
      </div>

      {/* Photo */}
      <div
        style={{
          position: 'absolute',
          left: photo.x,
          top: photo.y,
          transform: `translateX(${(1 - enter) * 1100}px) rotate(${(1 - enter) * 4}deg)`,
        }}
      >
        <Photo src={shot.src} focus={shot.focus} width={photo.w} height={photo.h} zoom={zoom} label={`PHOTO ${round.index + 1}`} />
        {shot.caption ? (
          <div
            style={{
              position: 'absolute',
              left: 24,
              right: 24,
              bottom: 100,
              textAlign: 'center',
              fontFamily,
              fontWeight: 800,
              fontSize: 38,
              color: '#fff',
              textShadow: '0 3px 14px rgba(0,0,0,0.9)',
            }}
          >
            {shot.caption}
          </div>
        ) : null}
      </div>

      {/* Map */}
      <div
        style={{
          position: 'absolute',
          left: map.x,
          top: map.y,
          width: map.w,
          height: map.h,
          borderRadius: 36,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
          opacity: round.index === 0 ? enter : 1,
        }}
      >
        <MapView
          camera={camera}
          width={map.w}
          height={map.h}
          round={round}
          reveal={reveal}
          frame={frame}
          labelsOpacity={interpolate(frame, [T.enter - 6, T.enter + 4], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })}
        />
      </div>

      {/* Timer sits on the seam between photo and map */}
      <div style={{position: 'absolute', left: timer.cx - timer.r - 10, top: timer.cy - timer.r - 10}}>
        <Countdown frame={frame - T.enter} totalFrames={think} fps={fps} radius={timer.r} revealed={frame >= revealStart} />
      </div>

      {/* Answer banner */}
      {frame >= revealStart ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: map.y + map.h + 28,
            display: 'flex',
            justifyContent: 'center',
            transform: `scale(${banner})`,
          }}
        >
          <div
            style={{
              background: COLORS.correct,
              color: '#05200F',
              fontFamily,
              fontWeight: 900,
              fontSize: 52,
              padding: '18px 44px',
              borderRadius: 60,
              boxShadow: '0 10px 40px rgba(46,224,123,0.45)',
              maxWidth: 980,
              textAlign: 'center',
            }}
          >
            It's {round.answerLabel}!
          </div>
        </div>
      ) : (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: map.y + map.h + 40,
            textAlign: 'center',
            fontFamily,
            fontWeight: 800,
            fontSize: 40,
            color: COLORS.muted,
            opacity: interpolate(frame, [T.enter, T.enter + 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
          }}
        >
          A, B, C or D?
        </div>
      )}

      {/* Sound */}
      {round.index > 0 ? <Html5Audio src={staticFile('sfx/whoosh.wav')} volume={sfx * 0.7} /> : null}
      {Array.from({length: Math.round(think / fps)}, (_, s) => {
        const remaining = Math.round(think / fps) - s;
        return (
          <Sequence key={s} from={T.enter + s * fps} durationInFrames={Math.round(fps / 2)} layout="none">
            <Html5Audio src={staticFile(remaining <= 3 ? 'sfx/tick-high.wav' : 'sfx/tick.wav')} volume={sfx} />
          </Sequence>
        );
      })}
      <Sequence from={revealStart} layout="none">
        <Html5Audio src={staticFile('sfx/reveal.wav')} volume={sfx} />
      </Sequence>
      {voiceClip ? (
        // just after the chime, while the "It's …!" banner pops in
        <Sequence from={revealStart + 6} layout="none">
          <Html5Audio src={voiceClip.src} volume={video.voice!.volume} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};
