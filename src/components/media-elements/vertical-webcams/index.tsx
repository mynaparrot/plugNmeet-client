import React, { useMemo } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { LocalParticipant, RemoteParticipant } from 'livekit-client';

import { RootState, useAppSelector } from '../../../store';
import VideoElements from '../videos';

interface IVerticalWebcamsProps {
  videoSubscribers?: Map<string, LocalParticipant | RemoteParticipant>;
}
const activateWebcamsViewSelector = createSelector(
  (state: RootState) => state.roomSettings.activateWebcamsView,
  (activateWebcamsView) => activateWebcamsView,
);
const VerticalWebcams = ({ videoSubscribers }: IVerticalWebcamsProps) => {
  const activateWebcamsView = useAppSelector(activateWebcamsViewSelector);

  const renderElms = useMemo(() => {
    if (!videoSubscribers) {
      return null;
    }
    return (
      <VideoElements
        videoSubscribers={videoSubscribers}
        perPage={3}
        isVertical={true}
      />
    );
  }, [videoSubscribers]);

  return activateWebcamsView ? renderElms : null;
};

export default VerticalWebcams;
