import React, { useMemo } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { LocalParticipant, RemoteParticipant } from 'livekit-client';

import { RootState, useAppSelector } from '../../../../store';
import MainVideoView from '../main-video-view';

interface IVerticalWebcamsProps {
  videoSubscribers?: Map<string, LocalParticipant | RemoteParticipant>;
}
const activateWebcamsViewSelector = createSelector(
  (state: RootState) => state.roomSettings.activateWebcamsView,
  (activateWebcamsView) => activateWebcamsView,
);
const VerticalVideoView = ({ videoSubscribers }: IVerticalWebcamsProps) => {
  const activateWebcamsView = useAppSelector(activateWebcamsViewSelector);

  const renderElms = useMemo(() => {
    if (!videoSubscribers) {
      return null;
    }
    return (
      <MainVideoView
        videoSubscribers={videoSubscribers}
        perPage={3}
        isVertical={true}
      />
    );
  }, [videoSubscribers]);

  return activateWebcamsView ? renderElms : null;
};

export default VerticalVideoView;
