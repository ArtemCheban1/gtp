/** [lon, lat] in degrees */
export type LonLat = [number, number];

/** [west, south, east, north] in degrees. `east < west` means the box crosses the antimeridian. */
export type BBox = [number, number, number, number];

export type PhotoSlot = {
  /** Absolute URL (http://localhost:3001/uploads/...) or staticFile() path. Empty = placeholder. */
  src: string;
  /** Optional hint shown under the photo, e.g. "Hint: they drive on the left" */
  caption?: string;
};

export type Place = {
  name: string;
  country?: string;
  lat: number;
  lon: number;
  /** Force the round-2 answer when auto-detection picks the wrong subregion (ids in shared/geo/regions.ts). */
  subId?: string;
};

export type MusicTrack = {
  src: string;
  /** 0..1 */
  volume: number;
};

/** Everything the video needs. This is the Remotion inputProps and the portal "project" format. */
export type VideoProps = {
  photos: [PhotoSlot, PhotoSlot, PhotoSlot];
  place: Place;
  /** Round-3 wrong answers. Missing/empty entries are auto-picked from the city list. */
  decoys: Place[];
  /** Shuffles the letter order of round-3 answers. */
  seed: number;
  thinkSeconds: number;
  music: MusicTrack | null;
  /** 0..1 */
  sfxVolume: number;
  texts: {
    title: string;
    cta: string;
    follow: string;
  };
};

export type OptionLetter = 'A' | 'B' | 'C' | 'D';

export type MapOption = {
  letter: OptionLetter;
  label: string;
  /** Region option (rounds 1–2): id of a zone or subregion */
  regionId?: string;
  /** Point option (round 3) */
  point?: LonLat;
  correct: boolean;
};

export type RoundSpec = {
  index: 0 | 1 | 2;
  question: string;
  /** What the map shows while the viewer thinks */
  view: BBox;
  kind: 'zones' | 'subregions' | 'points';
  /** For 'subregions'/'points': the zone/subregion that frames the map */
  focusId?: string;
  options: MapOption[];
  answerLabel: string;
};
