/** [lon, lat] in degrees */
export type LonLat = [number, number];

/** [west, south, east, north] in degrees. `east < west` means the box crosses the antimeridian. */
export type BBox = [number, number, number, number];

export type PhotoSlot = {
  /** Absolute URL (http://localhost:3001/uploads/...) or staticFile() path. Empty = placeholder. */
  src: string;
  /** Optional hint shown under the photo, e.g. "Hint: they drive on the left" */
  caption?: string;
  /** Point of interest, 0..1 of the image width/height. Default centre (0.5, 0.5). */
  focus?: {x: number; y: number};
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
  /** What round 3 asks for: 4 cities (default) or 4 countries of the region. */
  round3?: 'cities' | 'countries';
  /** Colour theme id (keys of THEMES in remotion/theme.ts). Default 'midnight'. */
  theme?: string;
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
  /** Region option: id of a zone or subregion (rounds 1–2) or a world-atlas country name ('countries' round) */
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
  kind: 'zones' | 'subregions' | 'points' | 'countries';
  /** For 'subregions'/'points': the zone/subregion that frames the map */
  focusId?: string;
  options: MapOption[];
  answerLabel: string;
};
