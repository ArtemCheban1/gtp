import React from 'react';
import {AbsoluteFill, Img} from 'remotion';
import {cameraForBox} from '../shared/geo/camera';
import {rapidPlan} from '../shared/rapid';
import {HEIGHT, WIDTH} from '../shared/timeline';
import type {VideoProps} from '../shared/types';
import {MapView} from './components/MapView';
import {ThemeProvider, fontFamily, themeFor, useTheme} from './theme';

/** Single-frame thumbnail: photo (or the first rapid country on the map), big title, badge, optional "#episode". */
export const Cover: React.FC<VideoProps> = (video) => (
  <ThemeProvider value={themeFor(video.theme)}>
    <CoverFrame {...video} />
  </ThemeProvider>
);

/** What the cover shows for each format. */
function coverContent(video: VideoProps) {
  if (video.format === 'rapid') {
    const plan = rapidPlan(video);
    const first = plan[0];
    const n = plan.length;
    return {
      photo: first?.round.kind === 'photo' ? first.round : undefined,
      map: first?.spec ? {spec: first.spec, view: first.view} : undefined,
      title: (video.rapid?.title || 'Guess the Country').toUpperCase(),
      badge: `${n} rounds · ${video.rapid?.seconds ?? 3}s`,
    };
  }
  if (video.format === 'pan') {
    return {photo: video.photos[0], title: (video.pan?.question || 'Do you know this city?').toUpperCase(), badge: 'Comment 👇'};
  }
  return {photo: video.photos[0], title: 'WHERE IS THIS?', badge: '3 guesses'};
}

const CoverFrame: React.FC<VideoProps> = (video) => {
  const {COLORS} = useTheme();
  const c = coverContent(video);
  const src = c.photo?.src;
  const focus = c.photo?.focus;
  const pos = `${(focus?.x ?? 0.5) * 100}% ${(focus?.y ?? 0.5) * 100}%`;
  const words = c.title.split(' ');
  const size = c.title.length <= 16 ? 170 : c.title.length <= 26 ? 135 : 110;

  return (
    <AbsoluteFill style={{background: `linear-gradient(160deg, ${COLORS.bg2}, ${COLORS.bg})`, fontFamily, color: COLORS.text}}>
      {src ? <Img src={src} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: pos}} /> : null}
      {!src && c.map ? (
        <MapView camera={cameraForBox(c.map.view, WIDTH, HEIGHT, 0.8)} width={WIDTH} height={HEIGHT} round={c.map.spec} reveal={0} frame={0} labelsOpacity={0} />
      ) : null}
      {/* Darken top and bottom so the text reads on any photo */}
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.15) 38%, rgba(0,0,0,0.15) 58%, rgba(0,0,0,0.8) 100%)',
        }}
      />
      <AbsoluteFill style={{alignItems: 'center', paddingTop: 200, paddingRight: 60, paddingLeft: 60, textAlign: 'center'}}>
        {video.episode ? (
          <div style={{fontSize: 60, fontWeight: 900, color: COLORS.bg, background: COLORS.accent, borderRadius: 50, padding: '6px 34px', marginBottom: 30}}>
            #{video.episode}
          </div>
        ) : null}
        <div style={{fontSize: size, fontWeight: 900, lineHeight: 0.98, textShadow: '0 10px 50px rgba(0,0,0,0.7)'}}>
          {words.map((w, i) => (
            <span key={i} style={{color: i === words.length - 1 ? COLORS.accent : undefined}}>
              {w}{' '}
            </span>
          ))}
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
          {c.badge}
        </div>
      </div>
    </AbsoluteFill>
  );
};
