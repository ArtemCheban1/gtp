import type {VideoProps} from './types';

export const DEFAULT_PROPS: VideoProps = {
  photos: [{src: ''}, {src: ''}, {src: ''}],
  place: {name: 'Sydney', country: 'Australia', lat: -33.87, lon: 151.21},
  decoys: [],
  seed: 1,
  thinkSeconds: 5,
  music: null,
  sfxVolume: 0.8,
  texts: {
    title: 'Guess the Place',
    cta: 'How many did you get right? Comment 0–3!',
    follow: 'Follow for a new place every day',
  },
};
