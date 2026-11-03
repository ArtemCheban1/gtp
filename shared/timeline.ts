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
/** Title card length — 0 unless the project turns it on (most viewers swipe away from a title card). */
export const introFrames = (p: Pick<VideoProps, 'intro'>) => (p.intro ? T.intro : 0);
export const roundStart = (p: Pick<VideoProps, 'thinkSeconds' | 'intro'>, i: number) => introFrames(p) + i * roundFrames(p);
export const outroStart = (p: Pick<VideoProps, 'thinkSeconds' | 'intro'>) => roundStart(p, 3);
export const totalFrames = (p: Pick<VideoProps, 'thinkSeconds' | 'intro'>) => outroStart(p) + T.outro;

// ── Rapid format ──
export const RT = {
  intro: 45,
  /** map flies / photo slides to the next round */
  enter: 9,
  reveal: 33,
  outro: 120,
};
type RapidTiming = {intro?: boolean; rapid?: {seconds: number; rounds: unknown[]}};
export const rapidIntroFrames = (p: RapidTiming) => (p.intro ? RT.intro : 0);
export const rapidThink = (p: RapidTiming) => Math.round((p.rapid?.seconds ?? 3) * FPS);
export const rapidRoundFrames = (p: RapidTiming) => RT.enter + rapidThink(p) + RT.reveal;
export const rapidRoundStart = (p: RapidTiming, i: number) => rapidIntroFrames(p) + i * rapidRoundFrames(p);
export const rapidOutroStart = (p: RapidTiming) => rapidRoundStart(p, p.rapid?.rounds.length ?? 0);

// ── "What's wrong with this map?" ──
export const ST = {
  /** map flies to the next area */
  enter: 12,
  /** country flashes, shrinks back to its true size, answer shows */
  reveal: 60,
  outro: 120,
};
type SpotTiming = {intro?: boolean; spot?: {seconds: number; rounds: unknown[]}};
export const spotThink = (p: SpotTiming) => Math.round((p.spot?.seconds ?? 6) * FPS);
export const spotRoundFrames = (p: SpotTiming) => ST.enter + spotThink(p) + ST.reveal;
export const spotRoundStart = (p: SpotTiming, i: number) => (p.intro ? RT.intro : 0) + i * spotRoundFrames(p);
export const spotOutroStart = (p: SpotTiming) => spotRoundStart(p, p.spot?.rounds.length ?? 0);

// ── "Guess before 100%" (outline) and "Which is bigger?" (versus) ──
export const OT = {enter: 6, reveal: 60, outro: 120};
export const VT = {enter: 10, reveal: 54, outro: 120};
type CfgTiming = {seconds: number; rounds: unknown[]} | undefined;
const think = (cfg: CfgTiming, fallback: number) => Math.round((cfg?.seconds ?? fallback) * FPS);
export const outlineThink = (p: {outline?: CfgTiming}) => think(p.outline, 5);
export const outlineRoundFrames = (p: {outline?: CfgTiming}) => OT.enter + outlineThink(p) + OT.reveal;
export const outlineRoundStart = (p: {intro?: boolean; outline?: CfgTiming}, i: number) => (p.intro ? RT.intro : 0) + i * outlineRoundFrames(p);
export const outlineOutroStart = (p: {intro?: boolean; outline?: CfgTiming}) => outlineRoundStart(p, p.outline?.rounds.length ?? 0);
export const versusThink = (p: {versus?: CfgTiming}) => think(p.versus, 5);
export const versusRoundFrames = (p: {versus?: CfgTiming}) => VT.enter + versusThink(p) + VT.reveal;
export const versusRoundStart = (p: {intro?: boolean; versus?: CfgTiming}, i: number) => (p.intro ? RT.intro : 0) + i * versusRoundFrames(p);
export const versusOutroStart = (p: {intro?: boolean; versus?: CfgTiming}) => versusRoundStart(p, p.versus?.rounds.length ?? 0);

// ── Pan format ──
/** How long the answer stays on screen at the end of a pan */
export const PAN_REVEAL = 45;
export const panFrames = (p: Pick<VideoProps, 'pan'>) => Math.round((p.pan?.seconds ?? 8) * FPS);

/** Length of any format. */
export function videoFrames(p: VideoProps): number {
  if (p.format === 'rapid') return rapidOutroStart(p) + RT.outro;
  if (p.format === 'pan') return panFrames(p);
  if (p.format === 'spot') return spotOutroStart(p) + ST.outro;
  if (p.format === 'outline') return outlineOutroStart(p) + OT.outro;
  if (p.format === 'versus') return versusOutroStart(p) + VT.outro;
  return totalFrames(p);
}
