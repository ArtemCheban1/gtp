import React from 'react';
import {AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {VideoProps} from '../../shared/types';
import {fontFamily, useTheme} from '../theme';

export const Intro: React.FC<{video: VideoProps}> = ({video}) => {
  const {COLORS} = useTheme();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const title = spring({frame, fps, config: {damping: 11, stiffness: 140}});
  const sub = spring({frame: frame - 10, fps, config: {damping: 200}});
  const out = interpolate(frame, [40, 54], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const bg = video.photos[0].src;

  return (
    <AbsoluteFill style={{opacity: out}}>
      {bg ? (
        <Img
          src={bg}
          style={{width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(40px) brightness(0.45)', transform: 'scale(1.2)'}}
        />
      ) : null}
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', fontFamily, color: COLORS.text, textAlign: 'center'}}>
        <div style={{transform: `scale(${title})`, fontSize: 130, fontWeight: 900, lineHeight: 1.0, textShadow: '0 8px 40px rgba(0,0,0,0.6)'}}>
          {video.texts.title.split(' ').map((w, i) => (
            <div key={i} style={{color: i === video.texts.title.split(' ').length - 1 ? COLORS.accent : COLORS.text}}>
              {w}
            </div>
          ))}
        </div>
        <div style={{opacity: sub, transform: `translateY(${(1 - sub) * 30}px)`, marginTop: 50, fontSize: 46, fontWeight: 800, color: COLORS.muted}}>
          3 PHOTOS · 3 GUESSES · {video.thinkSeconds} SECONDS
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
