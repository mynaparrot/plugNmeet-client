import React, { ReactElement, useEffect, useMemo, useState } from 'react';
import { LocalParticipant, RemoteParticipant, Track } from 'livekit-client';
import { concat } from 'es-toolkit/compat';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import VideoLayout from './videoLayout';
import VideoParticipant, { VideoParticipantProps } from './videoParticipant';
import { CurrentConnectionEvents } from '../../../helpers/livekit/types';
import { getMediaServerConn } from '../../../helpers/livekit/utils';
import { updatePinCamUserId } from '../../../store/slices/roomSettingsSlice';
import { participantsSelector } from '../../../store/slices/participantSlice';

interface IVideosComponentProps {
  isVertical?: boolean;
}

export interface VideoParticipantType {
  isAdmin: boolean;
  isLocal: boolean;
}

const VideosComponent = ({ isVertical }: IVideosComponentProps) => {
  const dispatch = useAppDispatch();
  const pinCamUserId = useAppSelector(
    (state) => state.roomSettings.pinCamUserId,
  );
  const [videoSubscribers, setVideoSubscribers] =
    useState<Map<string, LocalParticipant | RemoteParticipant>>();
  const currentConnection = getMediaServerConn();

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

  const { allParticipants, pinParticipant, totalNumWebcams } = useMemo(() => {
    let totalNumWebcams = 0;
    const localSubscribers: Array<ReactElement<VideoParticipantProps>> = [];
    let pinSubscribers: ReactElement<VideoParticipantProps> | undefined =
      undefined;
    const adminSubscribers: Array<ReactElement<VideoParticipantProps>> = [];
    const otherSubscribers: Array<ReactElement<VideoParticipantProps>> = [];

    const subscribers = videoSubscribers
      ? Array.from(videoSubscribers.values())
      : [];

    for (const participant of subscribers) {
      // we will only take if source from Camera
      const videoTracks = participant.getTrackPublication(Track.Source.Camera);
      if (videoTracks) {
        let isAdmin = false,
          displayPinIcon = true,
          displaySwitchCamIcon = true;

        const pp = participantsSelector.selectById(
          store.getState(),
          participant.identity,
        );
        isAdmin = !!pp?.metadata?.isAdmin;

        const participantType: VideoParticipantType = {
          isAdmin,
          isLocal: participant instanceof LocalParticipant,
        };

        if (subscribers.length === 1) {
          displayPinIcon = false;
          displaySwitchCamIcon = false;
        }

        // for (let i = 0; i < 3; i++) {
        totalNumWebcams++;
        const elm = (
          <VideoParticipant
            key={participant.sid}
            // key={participant.sid + '_' + i}
            participantType={participantType}
            participant={participant}
            displayPinIcon={displayPinIcon}
            displaySwitchCamIcon={displaySwitchCamIcon}
          />
        );

        if (pinCamUserId && participant.identity === pinCamUserId) {
          pinSubscribers = elm;
        } else if (isAdmin) {
          adminSubscribers.push(elm);
        } else if (participant instanceof LocalParticipant) {
          localSubscribers.push(elm);
        } else {
          otherSubscribers.push(elm);
        }
        // }
      }
    }

    const allParticipants = concat(
      adminSubscribers,
      localSubscribers,
      otherSubscribers,
    );

    let finalPinParticipant: ReactElement<VideoParticipantProps> | undefined =
      undefined;
    if (totalNumWebcams > 1 && pinSubscribers) {
      // only then we can activate pin cam
      finalPinParticipant = pinSubscribers;
    } else if (pinSubscribers) {
      // otherwise treat as normal
      allParticipants.push(pinSubscribers);
    }

    return {
      allParticipants,
      pinParticipant: finalPinParticipant,
      totalNumWebcams,
    };
  }, [videoSubscribers, pinCamUserId]);

  useEffect(() => {
    // If a pinCamUserId is set, but we couldn't find a matching participant
    // (e.g., they left or turned off their camera), we should clear the pin.
    if (pinCamUserId && !pinParticipant) {
      dispatch(updatePinCamUserId(undefined));
    }
  }, [pinCamUserId, pinParticipant, dispatch]);

  return (
    <VideoLayout
      allParticipants={allParticipants}
      pinParticipant={pinParticipant}
      totalNumWebcams={totalNumWebcams}
      isVertical={isVertical}
    />
  );
};

export default VideosComponent;
