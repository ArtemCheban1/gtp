import type {VideoProps} from './types';

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

/** All durations in frames. Change here and both the preview and the render follow. */
export const T = {
  intro: 54,
  /** photo slides in + map flies to the new view */
  enter: 21,
  /** correct answer highlighted */
  reveal: 66,
  outro: 135,
};

export const thinkFrames = (p: Pick<VideoProps, 'thinkSeconds'>) => Math.round(p.thinkSeconds * FPS);
export const roundFrames = (p: Pick<VideoProps, 'thinkSeconds'>) => T.enter + thinkFrames(p) + T.reveal;
export const roundStart = (p: Pick<VideoProps, 'thinkSeconds'>, i: number) => T.intro + i * roundFrames(p);
export const outroStart = (p: Pick<VideoProps, 'thinkSeconds'>) => roundStart(p, 3);
export const totalFrames = (p: Pick<VideoProps, 'thinkSeconds'>) => outroStart(p) + T.outro;
