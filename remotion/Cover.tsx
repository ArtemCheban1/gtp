import React from 'react';
import {AbsoluteFill, Img} from 'remotion';
import type {VideoProps} from '../shared/types';
import {ThemeProvider, fontFamily, themeFor, useTheme} from './theme';

/** Single-frame thumbnail for the reel: photo 1 full-bleed, big question, "3 guesses" badge. */
export const Cover: React.FC<VideoProps> = (video) => (
  <ThemeProvider value={themeFor(video.theme)}>
    <CoverFrame {...video} />
  </ThemeProvider>
);

const CoverFrame: React.FC<VideoProps> = (video) => {
  const {COLORS} = useTheme();
  const {src, focus} = video.photos[0];
  const pos = `${(focus?.x ?? 0.5) * 100}% ${(focus?.y ?? 0.5) * 100}%`;

  return (
    <AbsoluteFill style={{background: `linear-gradient(160deg, ${COLORS.bg2}, ${COLORS.bg})`, fontFamily, color: COLORS.text}}>
      {src ? <Img src={src} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: pos}} /> : null}
      {/* Darken top and bottom so the text reads on any photo */}
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.15) 38%, rgba(0,0,0,0.15) 58%, rgba(0,0,0,0.8) 100%)',
        }}
      />
      <AbsoluteFill style={{alignItems: 'center', paddingTop: 200, paddingRight: 60, paddingLeft: 60, textAlign: 'center'}}>
        <div style={{fontSize: 170, fontWeight: 900, lineHeight: 0.95, textShadow: '0 10px 50px rgba(0,0,0,0.7)'}}>
          <div>WHERE</div>
          <div>IS</div>
          <div style={{color: COLORS.accent}}>THIS?</div>
        </div>
      </AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          top: 1330,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            background: COLORS.accent,
            color: COLORS.bg,
            fontSize: 72,
            fontWeight: 900,
            padding: '22px 60px',
            borderRadius: 999,
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          }}
        >
          3 guesses
        </div>
      </div>
    </AbsoluteFill>
  );
};
