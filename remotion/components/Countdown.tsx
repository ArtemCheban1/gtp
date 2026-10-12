import React from 'react';
import {interpolate} from 'remotion';
import {COLORS, fontFamily} from '../theme';

type Props = {
  /** frames since the thinking phase started (can be <0 or past the end) */
  frame: number;
  totalFrames: number;
  fps: number;
  radius: number;
  revealed: boolean;
};

/** Ring timer with the remaining seconds in the middle; turns red for the last 3 seconds. */
export const Countdown: React.FC<Props> = ({frame, totalFrames, fps, radius, revealed}) => {
  const f = Math.max(0, Math.min(frame, totalFrames));
  const remaining = Math.ceil((totalFrames - f) / fps);
  const progress = f / totalFrames;
  const urgent = remaining <= 3 && !revealed;
  // little "pop" on every new second
  const intoSecond = f % fps;
  const pop = revealed ? 1 : interpolate(intoSecond, [0, 4, 10], [1.14, 1.06, 1], {extrapolateRight: 'clamp'});
  const stroke = revealed ? COLORS.correct : urgent ? COLORS.danger : COLORS.accent;
  const size = radius * 2 + 20;
  const c = 2 * Math.PI * radius;

  return (
    <div style={{width: size, height: size, position: 'relative', transform: `scale(${pop})`}}>
      <svg width={size} height={size} style={{position: 'absolute', inset: 0}}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill={COLORS.bg} stroke="rgba(255,255,255,0.15)" strokeWidth={12} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={revealed ? 0 : c * progress}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily,
          fontWeight: 900,
          fontSize: radius * 0.95,
          color: urgent ? COLORS.danger : COLORS.text,
        }}
      >
        {revealed ? (
          <svg width={radius} height={radius} viewBox="-10 -10 20 20">
            <path d="M -6 0 L -2 4 L 6 -5" fill="none" stroke={COLORS.correct} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          remaining
        )}
      </div>
    </div>
  );
};
