import React, { useEffect, useMemo, useState } from 'react';
import { LocalParticipant, RemoteParticipant, Track } from 'livekit-client';
import { createSelector } from '@reduxjs/toolkit';
import { concat, isEmpty } from 'lodash';

import VideosComponentElms, {
  VideoParticipantType,
} from './videosComponentElms';
import VideoParticipant from './videoParticipant';
import {
  CurrentConnectionEvents,
  IConnectLivekit,
} from '../../../helpers/livekit/types';
import { RootState, useAppSelector } from '../../../store';
import { ICurrentUserMetadata } from '../../../store/slices/interfaces/session';

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
  const [videoSubscribers, setVideoSubscribers] =
    useState<Map<string, LocalParticipant | RemoteParticipant>>();
  const [allParticipants, setAllParticipants] = useState<JSX.Element[]>([]);
  const [totalNumWebcams, setTotalNumWebcams] = useState<number>(0);

  useEffect(() => {
    if (currentConnection.videoSubscribersMap.size) {
      setVideoSubscribers(currentConnection.videoSubscribersMap as any);
    }
    currentConnection.on(
      CurrentConnectionEvents.VideoSubscribers,
      setVideoSubscribers,
    );
    return () => {
      currentConnection.off(
        CurrentConnectionEvents.VideoSubscribers,
        setVideoSubscribers,
      );
    };
  }, [currentConnection]);

  useMemo(() => {
    if (!videoSubscribers) {
      return;
    } else if (!videoSubscribers.size) {
      setTotalNumWebcams(0);
      setAllParticipants([]);
    }

    let totalNumWebcams = 0;
    const localSubscribers: Array<JSX.Element> = [];
    const adminSubscribers: Array<JSX.Element> = [];
    const otherSubscribers: Array<JSX.Element> = [];

    videoSubscribers.forEach((participant) => {
      // we will only take if source from Camera
      const videoTracks = participant
        .getTracks()
        .filter((track) => track.source === Track.Source.Camera);

      if (videoTracks.length) {
        let isAdmin = false;
        if (participant.metadata && !isEmpty(participant.metadata)) {
          const metadata: ICurrentUserMetadata = JSON.parse(
            participant.metadata,
          );
          isAdmin = metadata.is_admin;
        }

        const participantType: VideoParticipantType = {
          isAdmin,
          isLocal: participant instanceof LocalParticipant,
        };

        totalNumWebcams = totalNumWebcams + videoTracks.length;
        const elm = (
          <VideoParticipant
            key={participant.sid}
            participantType={participantType}
            participant={participant}
          />
        );

        if (isAdmin) {
          adminSubscribers.push(elm);
        } else {
          if (participant instanceof LocalParticipant) {
            localSubscribers.push(elm);
          } else {
            otherSubscribers.push(elm);
          }
        }
      }
    });

    const allParticipants = concat(
      adminSubscribers,
      localSubscribers,
      otherSubscribers,
    );

    setTotalNumWebcams(totalNumWebcams);
    setAllParticipants(allParticipants);
  }, [videoSubscribers]);

  const videoSubscriberElms = useMemo(() => {
    return (
      <VideosComponentElms
        allParticipants={allParticipants}
        totalNumWebcams={totalNumWebcams}
        isVertical={isVertical}
      />
    );
    //eslint-disable-next-line
  }, [allParticipants, isVertical]);

  return <>{activateWebcamsView ? videoSubscriberElms : null}</>;
};

export default VideosComponent;
