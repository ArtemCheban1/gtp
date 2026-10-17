import React from 'react';
import {Img} from 'remotion';
import {fontFamily, useTheme} from '../theme';

type Props = {
  src: string;
  width: number;
  height: number;
  /** 1 → 1.08 slow zoom over the round */
  zoom: number;
  /** Point of interest 0..1; keeps it in frame when the image is cropped by `cover`. */
  focus?: {x: number; y: number};
  label?: string;
  radius?: number;
};

/** Photo with a slow Ken Burns zoom; draws a placeholder when no image was uploaded yet. */
export const Photo: React.FC<Props> = ({src, width, height, zoom, focus, label, radius = 36}) => {
  const {COLORS} = useTheme();
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        overflow: 'hidden',
        position: 'relative',
        background: `linear-gradient(135deg, ${COLORS.bg2}, ${COLORS.ocean})`,
        boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
      }}
    >
      {src ? (
        <Img
          src={src}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: `${(focus?.x ?? 0.5) * 100}% ${(focus?.y ?? 0.5) * 100}%`,
            transformOrigin: `${(focus?.x ?? 0.5) * 100}% ${(focus?.y ?? 0.5) * 100}%`,
            transform: `scale(${zoom})`,
          }}
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
};
