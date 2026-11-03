import {createContext, useContext} from 'react';
import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';
import type {OptionLetter} from '../shared/types';

// Bundled locally (public/fonts, SIL OFL) so rendering works offline.
export const fontFamily = 'Montserrat';
loadFont({family: fontFamily, url: staticFile('fonts/Montserrat-wght.woff2'), weight: '100 900'});

export type Palette = {
  bg: string;
  bg2: string;
  ocean: string;
  oceanDeep: string;
  land: string;
  landFocus: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  correct: string;
  danger: string;
};

export type Theme = {name: string; colors: Palette; options: Record<OptionLetter, string>};

const BASE_OPTIONS: Record<OptionLetter, string> = {A: '#FF5A5F', B: '#3B82F6', C: '#F5B700', D: '#22C55E'};
const COMMON = {border: 'rgba(10, 20, 30, 0.45)', text: '#FFFFFF', muted: 'rgba(255,255,255,0.7)', correct: '#2EE07B', danger: '#FF4D4F'};

export const THEMES = {
  midnight: {
    name: 'Midnight',
    colors: {...COMMON, bg: '#0B1622', bg2: '#13283D', ocean: '#1B3B5A', oceanDeep: '#12304B', land: '#56677A', landFocus: '#E8DDC4', accent: '#FFD23F'},
    options: BASE_OPTIONS,
  },
  sunset: {
    name: 'Sunset',
    colors: {...COMMON, bg: '#1E0E24', bg2: '#3A1640', ocean: '#3B2357', oceanDeep: '#2A1844', land: '#7A5C72', landFocus: '#FFE3C2', accent: '#FF9E3D'},
    options: {A: '#FF4F81', B: '#7C5CFF', C: '#FFC23D', D: '#2ED3B7'},
  },
  jungle: {
    name: 'Jungle',
    colors: {...COMMON, bg: '#0A1A12', bg2: '#123222', ocean: '#174A45', oceanDeep: '#0F3733', land: '#5E7556', landFocus: '#F1E6B8', accent: '#C6F432', correct: '#4CFF8F'},
    options: {A: '#FF6B4A', B: '#3BA7FF', C: '#FFD23F', D: '#B57CFF'},
  },
  arctic: {
    name: 'Arctic',
    colors: {...COMMON, bg: '#0D1B2A', bg2: '#1B3A52', ocean: '#2B5D7D', oceanDeep: '#1F4A66', land: '#8DA2B5', landFocus: '#FFFFFF', accent: '#5EEBFF'},
    options: BASE_OPTIONS,
  },
  ocean: {
    name: 'Ocean',
    colors: {...COMMON, bg: '#04161C', bg2: '#0A2D36', ocean: '#0E4A57', oceanDeep: '#093A45', land: '#4F6E73', landFocus: '#EAF4EE', accent: '#2EE6C5', correct: '#7CFF6B'},
    options: {A: '#FF6B6B', B: '#4D96FF', C: '#FFD93D', D: '#C77DFF'},
  },
  desert: {
    name: 'Desert',
    colors: {...COMMON, bg: '#1F1309', bg2: '#3A2412', ocean: '#2E3F52', oceanDeep: '#223142', land: '#8A6F55', landFocus: '#F6E2BE', accent: '#FFB347'},
    options: {A: '#E4572E', B: '#2E86AB', C: '#F3A712', D: '#29BF12'},
  },
  neon: {
    name: 'Neon',
    colors: {...COMMON, bg: '#0B0716', bg2: '#1C1033', ocean: '#1A1440', oceanDeep: '#120D2E', land: '#4B4470', landFocus: '#E6E1FF', accent: '#FF3CAC', correct: '#39FF88'},
    options: {A: '#FF3CAC', B: '#00D4FF', C: '#FFE600', D: '#7CFF4F'},
  },
  cherry: {
    name: 'Cherry',
    colors: {...COMMON, bg: '#1A0709', bg2: '#360D14', ocean: '#2B2033', oceanDeep: '#1F1626', land: '#6E4D55', landFocus: '#FBE7E2', accent: '#FF5D73'},
    options: {A: '#FF5D73', B: '#4EA8DE', C: '#FFC857', D: '#5ED89A'},
  },
  mint: {
    name: 'Mint',
    colors: {...COMMON, bg: '#071A16', bg2: '#0E3029', ocean: '#164B4F', oceanDeep: '#0F393D', land: '#5A7A6E', landFocus: '#F0FAF2', accent: '#8CFFB4', correct: '#E9FF70'},
    options: {A: '#FF7A59', B: '#59A5FF', C: '#FFD166', D: '#B388FF'},
  },
  royal: {
    name: 'Royal',
    colors: {...COMMON, bg: '#0C0A24', bg2: '#1D1848', ocean: '#252063', oceanDeep: '#1A1650', land: '#5D5888', landFocus: '#F3EEDD', accent: '#F5C542'},
    options: {A: '#FF5E78', B: '#4CC9F0', C: '#F5C542', D: '#5BE584'},
  },
} satisfies Record<string, Theme>;

export type ThemeId = keyof typeof THEMES;
export const DEFAULT_THEME: ThemeId = 'midnight';
export const themeFor = (id: string | undefined): Theme => THEMES[(id ?? DEFAULT_THEME) as ThemeId] ?? THEMES[DEFAULT_THEME];

const ThemeContext = createContext<Theme>(THEMES[DEFAULT_THEME]);
export const ThemeProvider = ThemeContext.Provider;
/** Colours of the current video theme (set from `VideoProps.theme` at the composition root). */
export const useTheme = () => {
  const t = useContext(ThemeContext);
  return {COLORS: t.colors, OPTION_COLORS: t.options};
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
