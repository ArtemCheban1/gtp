import React from 'react';
import {AbsoluteFill, Html5Audio, Img, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import type {VideoProps} from '../../shared/types';
import {fontFamily, useTheme} from '../theme';

/** Score screen for multi-round formats: "?/N", all answers at a glance (people pause here), score prompt. */
export const ScoreOutro: React.FC<{video: VideoProps; question: string; answers: string[]; bg?: string}> = ({
  video,
  question,
  answers,
  bg,
}) => {
  const {COLORS} = useTheme();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = (delay: number, damping = 14) => spring({frame: frame - delay, fps, config: {damping, stiffness: 150}});
  const two = answers.length > 5;

  return (
    <AbsoluteFill style={{fontFamily, color: COLORS.text, textAlign: 'center'}}>
      {bg ? (
        <Img
          src={bg}
          style={{position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(36px) brightness(0.35)', transform: 'scale(1.2)'}}
        />
      ) : null}
      <div style={{position: 'absolute', top: 150, left: 0, right: 0}}>
        <div style={{fontSize: 52, fontWeight: 800, color: COLORS.muted, opacity: s(0)}}>{question}</div>
        <div style={{fontSize: 170, fontWeight: 900, lineHeight: 1.05, color: COLORS.accent, transform: `scale(${s(5, 10)})`}}>?/{answers.length}</div>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 520,
          left: 70,
          right: 70,
          display: 'grid',
          gridTemplateColumns: two ? '1fr 1fr' : '1fr',
          gap: '18px 24px',
        }}
      >
        {answers.map((a, i) => (
          <div
            key={i}
            style={{
              opacity: s(14 + i * 3),
              transform: `translateY(${(1 - s(14 + i * 3)) * 60}px)`,
              background: 'rgba(8,16,26,0.75)',
              border: `3px solid ${COLORS.correct}`,
              borderRadius: 40,
              padding: '12px 22px',
              fontSize: two ? 36 : 42,
              fontWeight: 800,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            <span style={{color: COLORS.correct}}>{i + 1}.</span> {a}
          </div>
        ))}
      </div>
      <div style={{position: 'absolute', top: 1340, left: 60, right: 60, opacity: s(45, 200)}}>
        <div style={{fontSize: 50, fontWeight: 900}}>Comment your score 👇</div>
        <div style={{fontSize: 40, fontWeight: 800, color: COLORS.accent, marginTop: 20}}>{video.texts.follow}</div>
      </div>
      <Html5Audio src={staticFile('sfx/whoosh.wav')} volume={video.sfxVolume * 0.7} />
    </AbsoluteFill>
  );
};
