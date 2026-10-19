import React from 'react';
import {Composition} from 'remotion';
import {DEFAULT_PROPS} from '../shared/defaults';
import {FPS, HEIGHT, WIDTH, videoFrames} from '../shared/timeline';
import type {VideoProps} from '../shared/types';
import {Cover} from './Cover';
import {GuessThePlace} from './GuessThePlace';

export const COMPOSITION_ID = 'GuessThePlace';
export const COVER_ID = 'Cover';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id={COMPOSITION_ID}
      component={GuessThePlace}
      width={WIDTH}
      height={HEIGHT}
      fps={FPS}
      durationInFrames={videoFrames(DEFAULT_PROPS)}
      defaultProps={DEFAULT_PROPS}
      calculateMetadata={({props}: {props: VideoProps}) => ({durationInFrames: videoFrames(props)})}
    />
    <Composition id={COVER_ID} component={Cover} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={1} defaultProps={DEFAULT_PROPS} />
  </>
);
