import React from 'react';
import {Composition} from 'remotion';
import {DEFAULT_PROPS} from '../shared/defaults';
import {FPS, HEIGHT, WIDTH, totalFrames} from '../shared/timeline';
import type {VideoProps} from '../shared/types';
import {GuessThePlace} from './GuessThePlace';

export const COMPOSITION_ID = 'GuessThePlace';

export const RemotionRoot: React.FC = () => (
  <Composition
    id={COMPOSITION_ID}
    component={GuessThePlace}
    width={WIDTH}
    height={HEIGHT}
    fps={FPS}
    durationInFrames={totalFrames(DEFAULT_PROPS)}
    defaultProps={DEFAULT_PROPS}
    calculateMetadata={({props}: {props: VideoProps}) => ({durationInFrames: totalFrames(props)})}
  />
);
