import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';
import type {OptionLetter} from '../shared/types';

// Bundled locally (public/fonts, SIL OFL) so rendering works offline.
export const fontFamily = 'Montserrat';
loadFont({family: fontFamily, url: staticFile('fonts/Montserrat-wght.woff2'), weight: '100 900'});

export const COLORS = {
  bg: '#0B1622',
  bg2: '#13283D',
  ocean: '#1B3B5A',
  oceanDeep: '#12304B',
  land: '#56677A',
  landFocus: '#E8DDC4',
  border: 'rgba(10, 20, 30, 0.45)',
  text: '#FFFFFF',
  muted: 'rgba(255,255,255,0.7)',
  accent: '#FFD23F',
  correct: '#2EE07B',
  danger: '#FF4D4F',
};

export const OPTION_COLORS: Record<OptionLetter, string> = {
  A: '#FF5A5F',
  B: '#3B82F6',
  C: '#F5B700',
  D: '#22C55E',
};

/**
 * Layout of the 1080×1920 frame. Instagram/Facebook overlay their UI on the bottom ~18%
 * and on a ~120px strip at the right, so everything that matters sits above y=1600.
 */
export const LAYOUT = {
  header: {y: 70, h: 190},
  photo: {x: 40, y: 270, w: 1000, h: 700},
  timer: {cx: 540, cy: 985, r: 78},
  map: {x: 40, y: 1000, w: 1000, h: 600},
  footerY: 1640,
};
