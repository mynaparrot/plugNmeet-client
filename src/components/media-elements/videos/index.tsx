import React, { useEffect, useMemo, useState } from 'react';
import {
  CurrentConnectionEvents,
  IConnectLivekit,
} from '../../../helpers/livekit/types';
import { LocalParticipant, RemoteParticipant } from 'livekit-client';
import { createSelector } from '@reduxjs/toolkit';

import MainVideoView from './main-video-view';
import VerticalVideoView from './vertical-video-view';

import { RootState, useAppSelector } from '../../../store';

interface IVideosComponentProps {
  currentConnection?: IConnectLivekit;
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
      return <VerticalVideoView videoSubscribers={videoSubscribers} />;
    } else {
      return <MainVideoView videoSubscribers={videoSubscribers} />;
    }
  }, [videoSubscribers, isVertical]);

  return <>{activateWebcamsView ? videoSubscriberElms : null}</>;
};

export default VideosComponent;
