import React, { useEffect, useMemo, useState } from 'react';
import {
  CurrentConnectionEvents,
  IConnectLivekit,
} from '../../../helpers/livekit/types';
import { LocalParticipant, RemoteParticipant } from 'livekit-client';
import { createSelector } from '@reduxjs/toolkit';

import VideoElements from './index';
import VerticalWebcams from '../vertical-webcams';

import { RootState, useAppSelector } from '../../../store';

interface IVideoComponentProps {
  currentConnection?: IConnectLivekit;
  isVertical?: boolean;
}

const activateWebcamsViewSelector = createSelector(
  (state: RootState) => state.roomSettings.activateWebcamsView,
  (activateWebcamsView) => activateWebcamsView,
);

const VideoComponent = ({
  currentConnection,
  isVertical,
}: IVideoComponentProps) => {
  const activateWebcamsView = useAppSelector(activateWebcamsViewSelector);
  const [videoSubscribers, setVideoSubscribers] =
    useState<Map<string, LocalParticipant | RemoteParticipant>>();

  useEffect(() => {
    if (currentConnection?.videoSubscribersMap.size) {
      setVideoSubscribers(currentConnection.videoSubscribersMap as any);
    }
    currentConnection?.on(
      CurrentConnectionEvents.VideoSubscribers,
      setVideoSubscribers,
    );
    return () => {
      currentConnection?.off(
        CurrentConnectionEvents.VideoSubscribers,
        setVideoSubscribers,
      );
    };
  }, [currentConnection]);

  const videoSubscriberElms = useMemo(() => {
    if (!videoSubscribers?.size) {
      return null;
    }
    if (isVertical) {
      return <VerticalWebcams videoSubscribers={videoSubscribers} />;
    } else {
      return <VideoElements videoSubscribers={videoSubscribers} />;
    }
  }, [videoSubscribers, isVertical]);

  return <>{activateWebcamsView ? videoSubscriberElms : null}</>;
};

export default VideoComponent;
