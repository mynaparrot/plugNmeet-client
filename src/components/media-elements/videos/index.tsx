import React, { useMemo } from 'react';
import { IConnectLivekit } from '../../../helpers/livekit/types';
import { createSelector } from '@reduxjs/toolkit';

import { RootState, useAppSelector } from '../../../store';
import VideosComponentElms from './videosComponentElms';

interface IVideosComponentProps {
  currentConnection: IConnectLivekit;
  isVertical?: boolean;
}

const activateWebcamsViewSelector = createSelector(
  (state: RootState) => state.roomSettings.activateWebcamsView,
  (activateWebcamsView) => activateWebcamsView,
);

const VideosComponent = ({
  currentConnection,
  isVertical,
}: IVideosComponentProps) => {
  const activateWebcamsView = useAppSelector(activateWebcamsViewSelector);

  const videoSubscriberElms = useMemo(() => {
    return (
      <VideosComponentElms
        currentConnection={currentConnection}
        perPage={isVertical ? 3 : undefined}
        isVertical={isVertical}
      />
    );
  }, [currentConnection, isVertical]);

  return <>{activateWebcamsView ? videoSubscriberElms : null}</>;
};

export default VideosComponent;
