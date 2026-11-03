import {captionStyles} from '../shared/caption';
import type {VideoProps} from '../shared/types';
import {THEMES} from '../remotion/theme';

const pickOther = <T>(list: T[], current: T | undefined): T | undefined => {
  const others = list.length > 1 ? list.filter((x) => x !== current) : list;
  return others.length ? others[Math.floor(Math.random() * others.length)] : undefined;
};

/**
 * A fresh "look" for a new video: another colour theme, another caption style and another track from the
 * music library — each different from the current one, so consecutive posts never look the same.
 * (Random here is fine: the result is stored in the props, the video itself stays deterministic.)
 */
export function randomLook(props: VideoProps, library: string[]): Partial<VideoProps> {
  const theme = pickOther(Object.keys(THEMES), props.theme ?? 'midnight');
  const styles = captionStyles(props.format).map((_, i) => i);
  const captionStyle = pickOther(styles, props.captionStyle);
  const track = pickOther(library, props.music?.src);
  return {
    theme,
    captionStyle,
    ...(track ? {music: {src: track, volume: props.music?.volume ?? 0.35}} : {}),
  };
}

const AUTO_KEY = 'gtp:autoLook';
export const loadAutoLook = () => {
  try {
    return localStorage.getItem(AUTO_KEY) !== '0';
  } catch {
    return true;
  }
};
export const saveAutoLook = (on: boolean) => {
  try {
    localStorage.setItem(AUTO_KEY, on ? '1' : '0');
  } catch {
    // private mode — the preference just isn't remembered
  }
};
