import React from 'react';
import {Img} from 'remotion';
import {COLORS, fontFamily} from '../theme';

type Props = {
  src: string;
  width: number;
  height: number;
  /** 1 → 1.08 slow zoom over the round */
  zoom: number;
  label?: string;
  radius?: number;
};

/** Photo with a slow Ken Burns zoom; draws a placeholder when no image was uploaded yet. */
export const Photo: React.FC<Props> = ({src, width, height, zoom, label, radius = 36}) => (
  <div
    style={{
      width,
      height,
      borderRadius: radius,
      overflow: 'hidden',
      position: 'relative',
      background: `linear-gradient(135deg, ${COLORS.bg2}, #24486B)`,
      boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
    }}
  >
    {src ? (
      <Img
        src={src}
        style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom})`}}
      />
    ) : (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: COLORS.muted,
          fontFamily,
          fontWeight: 800,
          fontSize: 56,
        }}
      >
        {label ?? 'PHOTO'}
      </div>
    )}
  </div>
);
