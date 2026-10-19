import React from 'react';
import {AbsoluteFill, Html5Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {PAN_REVEAL} from '../../shared/timeline';
import type {VideoProps} from '../../shared/types';
import {fontFamily, useTheme} from '../theme';

const clamp = (v: number) => Math.min(1, Math.max(0, v));

/**
 * "Do you know this city?" — one photo, slowly panned across its point of interest.
 * Short and loopable; the answer (optional) only shows for the last ~1.5 s.
 */
export const PanVideo: React.FC<{video: VideoProps}> = ({video}) => {
  const {COLORS} = useTheme();
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const shot = video.photos[0];
  const pan = video.pan ?? {seconds: 8, question: 'Do you know this city?', reveal: true};
  const fx = shot.focus?.x ?? 0.5;
  const fy = shot.focus?.y ?? 0.5;
  const t = frame / Math.max(1, durationInFrames - 1);

  // Pan across the point of interest (portrait crop of a landscape photo shows a strip of it)
  const x = interpolate(t, [0, 1], [clamp(fx - 0.3), clamp(fx + 0.3)]);
  const zoom = interpolate(t, [0, 1], [1.06, 1.16]);
  const revealStart = pan.reveal ? durationInFrames - PAN_REVEAL : Infinity;
  const pop = spring({frame: frame - revealStart, fps, config: {damping: 12, stiffness: 170}});
  const q = spring({frame, fps, config: {damping: 14, stiffness: 120}});
  const hintIn = interpolate(frame, [durationInFrames * 0.4, durationInFrames * 0.4 + 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const place = video.place;
  const answer = `${place.name}${place.country && place.country !== place.name ? `, ${place.country}` : ''}`;

  return (
    <AbsoluteFill style={{background: COLORS.bg, fontFamily, color: COLORS.text, textAlign: 'center'}}>
      {shot.src ? (
        <Img
          src={shot.src}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: `${x * 100}% ${fy * 100}%`,
            transform: `scale(${zoom})`,
            transformOrigin: `${x * 100}% ${fy * 100}%`,
          }}
        />
      ) : (
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', color: COLORS.muted, fontSize: 60, fontWeight: 800}}>
          PHOTO
        </AbsoluteFill>
      )}
      <AbsoluteFill
        style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.75) 100%)'}}
      />

      <div style={{position: 'absolute', top: 150, left: 60, right: 140, transform: `translateY(${(1 - q) * -60}px)`, opacity: q}}>
        {video.episode ? <div style={{fontSize: 40, fontWeight: 800, color: COLORS.accent, letterSpacing: 4}}>#{video.episode}</div> : null}
        <div style={{fontSize: 96, fontWeight: 900, lineHeight: 1.02, textShadow: '0 8px 40px rgba(0,0,0,0.7)'}}>{pan.question}</div>
      </div>

      {shot.caption ? (
        <div
          style={{
            position: 'absolute',
            top: 1180,
            left: 60,
            right: 140,
            fontSize: 44,
            fontWeight: 800,
            opacity: frame < revealStart ? hintIn : 0,
            textShadow: '0 3px 14px rgba(0,0,0,0.9)',
          }}
        >
          {shot.caption}
        </div>
      ) : null}

      <div style={{position: 'absolute', top: 1360, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
        {frame >= revealStart ? (
          <div
            style={{
              transform: `scale(${pop})`,
              background: COLORS.correct,
              color: '#05200F',
              fontSize: 64,
              fontWeight: 900,
              padding: '20px 50px',
              borderRadius: 70,
              maxWidth: 900,
              boxShadow: '0 10px 40px rgba(46,224,123,0.45)',
            }}
          >
            📍 {answer}
          </div>
        ) : (
          <div style={{background: 'rgba(8,16,26,0.78)', fontSize: 50, fontWeight: 900, padding: '18px 44px', borderRadius: 60}}>
            Comment your guess 👇
          </div>
        )}
      </div>

      {Number.isFinite(revealStart) ? (
        <Sequence from={revealStart} layout="none">
          <Html5Audio src={staticFile('sfx/reveal.wav')} volume={video.sfxVolume} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};
