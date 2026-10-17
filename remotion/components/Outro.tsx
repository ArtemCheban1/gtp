import React from 'react';
import {AbsoluteFill, Html5Audio, Img, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import type {RoundSpec, VideoProps} from '../../shared/types';
import {fontFamily, useTheme} from '../theme';
import {Photo} from './Photo';

export const Outro: React.FC<{video: VideoProps; rounds: RoundSpec[]}> = ({video, rounds}) => {
  const {COLORS} = useTheme();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = (delay: number, damping = 14) => spring({frame: frame - delay, fps, config: {damping, stiffness: 150}});
  const bg = video.photos[2].src || video.photos[0].src;
  const place = video.place;

  return (
    <AbsoluteFill style={{fontFamily, color: COLORS.text, textAlign: 'center'}}>
      {bg ? (
        <Img
          src={bg}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'blur(36px) brightness(0.4)',
            transform: 'scale(1.2)',
          }}
        />
      ) : null}

      <div style={{position: 'absolute', top: 150, left: 0, right: 0}}>
        <div style={{fontSize: 48, fontWeight: 800, color: COLORS.muted, opacity: s(0)}}>The answer is</div>
        <div style={{fontSize: 120, fontWeight: 900, lineHeight: 1.05, transform: `scale(${s(6, 10)})`, color: COLORS.accent, padding: '0 40px'}}>
          {place.name}
        </div>
        {place.country ? (
          <div style={{fontSize: 56, fontWeight: 800, opacity: s(12)}}>{place.country}</div>
        ) : null}
      </div>

      {/* The three photos */}
      <div style={{position: 'absolute', top: 560, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 24}}>
        {video.photos.map((p, i) => (
          <div key={i} style={{transform: `translateY(${(1 - s(14 + i * 5)) * 400}px) rotate(${(i - 1) * 3}deg)`}}>
            <Photo src={p.src} focus={p.focus} width={310} height={420} zoom={1} radius={24} label={`${i + 1}`} />
          </div>
        ))}
      </div>

      {/* Score path: zone → region → place */}
      <div style={{position: 'absolute', top: 1050, left: 60, right: 60, display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center'}}>
        {rounds.map((r, i) => (
          <div
            key={i}
            style={{
              opacity: s(30 + i * 6),
              transform: `translateX(${(1 - s(30 + i * 6)) * -200}px)`,
              background: 'rgba(8,16,26,0.75)',
              border: `3px solid ${COLORS.correct}`,
              borderRadius: 50,
              padding: '12px 34px',
              fontSize: 40,
              fontWeight: 800,
            }}
          >
            <span style={{color: COLORS.correct}}>{i + 1}.</span> {r.answerLabel}
          </div>
        ))}
      </div>

      <div style={{position: 'absolute', top: 1370, left: 60, right: 60, opacity: s(55, 200)}}>
        <div style={{fontSize: 50, fontWeight: 900}}>{video.texts.cta}</div>
        <div style={{fontSize: 40, fontWeight: 800, color: COLORS.accent, marginTop: 20}}>{video.texts.follow}</div>
      </div>

      <Html5Audio src={staticFile('sfx/whoosh.wav')} volume={video.sfxVolume * 0.7} />
    </AbsoluteFill>
  );
};
