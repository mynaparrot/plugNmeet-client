import React, { useEffect, useState } from 'react';
import { LocalParticipant, RemoteParticipant, Track } from 'livekit-client';
import { createSelector } from '@reduxjs/toolkit';
import { concat, isEmpty } from 'lodash';

import { RootState, useAppSelector } from '../../../store';
import { ICurrentUserMetadata } from '../../../store/slices/interfaces/session';
import { participantsSelector } from '../../../store/slices/participantSlice';
import VideosComponentElms, {
  VideoParticipantType,
} from './videosComponentElms';
import VideoParticipant from './videoParticipant';
import {
  CurrentConnectionEvents,
  IConnectLivekit,
} from '../../../helpers/livekit/types';

interface IVideosComponentProps {
  currentConnection: IConnectLivekit;
  isVertical?: boolean;
}

const refreshWebcamsSelector = createSelector(
  (state: RootState) => state.roomSettings,
  (roomSettings) => roomSettings.refreshWebcams,
);

const VideosComponent = ({
  currentConnection,
  isVertical,
}: IVideosComponentProps) => {
  const participants = useAppSelector(participantsSelector.selectAll);
  const refreshWebcams = useAppSelector(refreshWebcamsSelector);
  const [videoSubscribers, setVideoSubscribers] =
    useState<Map<string, LocalParticipant | RemoteParticipant>>();
  const [allParticipants, setAllParticipants] = useState<Array<JSX.Element>>(
    [],
  );
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

  useEffect(() => {
    if (!videoSubscribers) {
      return;
    }

    let totalNumWebcams = 0;
    const localSubscribers: Array<JSX.Element> = [];
    const adminPinSubscribers: Array<JSX.Element> = [];
    const adminSubscribers: Array<JSX.Element> = [];
    const otherPinSubscribers: Array<JSX.Element> = [];
    const otherSubscribers: Array<JSX.Element> = [];

    videoSubscribers.forEach((participant) => {
      // we will only take if source from Camera
      const videoTracks = participant
        .getTracks()
        .filter((track) => track.source === Track.Source.Camera);

      if (videoTracks.length) {
        let isAdmin = false;
        const pinWebcam = participants.find(
          (p) => p.userId === participant.identity && p.pinWebcam,
        );

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

        //for (let i = 0; i < 20; i++) {
        totalNumWebcams += videoTracks.length;
        const elm = (
          <VideoParticipant
            key={participant.sid}
            //key={participant.sid + '_' + i}
            participantType={participantType}
            participant={participant}
          />
        );

        if (isAdmin && pinWebcam) {
          adminPinSubscribers.push(elm);
        } else if (isAdmin) {
          adminSubscribers.push(elm);
        } else if (pinWebcam) {
          otherPinSubscribers.push(elm);
        } else if (participant instanceof LocalParticipant) {
          localSubscribers.push(elm);
        } else {
          otherSubscribers.push(elm);
        }
        //}
      }
    });

    const allParticipants = concat(
      adminPinSubscribers,
      adminSubscribers,
      otherPinSubscribers,
      localSubscribers,
      otherSubscribers,
    );

    setAllParticipants(allParticipants);
    setTotalNumWebcams(totalNumWebcams);
    //eslint-disable-next-line
  }, [videoSubscribers, refreshWebcams]);

  return (
    <VideosComponentElms
      allParticipants={allParticipants}
      totalNumWebcams={totalNumWebcams}
      isVertical={isVertical}
    />
  );
};

export default VideosComponent;
