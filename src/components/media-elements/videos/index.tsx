import React, { ReactElement, useEffect, useState } from 'react';
import { LocalParticipant, RemoteParticipant, Track } from 'livekit-client';
import { concat } from 'es-toolkit/compat';

import { useAppDispatch, useAppSelector } from '../../../store';
import { ICurrentUserMetadata } from '../../../store/slices/interfaces/session';
import VideosComponentElms, {
  VideoParticipantType,
} from './videosComponentElms';
import VideoParticipant, { VideoParticipantProps } from './videoParticipant';
import { CurrentConnectionEvents } from '../../../helpers/livekit/types';
import { getMediaServerConn } from '../../../helpers/livekit/utils';
import { updatePinCamUserId } from '../../../store/slices/roomSettingsSlice';

interface IVideosComponentProps {
  isVertical?: boolean;
}

const VideosComponent = ({ isVertical }: IVideosComponentProps) => {
  const dispatch = useAppDispatch();
  const pinCamUserId = useAppSelector(
    (state) => state.roomSettings.pinCamUserId,
  );
  const [videoSubscribers, setVideoSubscribers] =
    useState<Map<string, LocalParticipant | RemoteParticipant>>();
  const [allParticipants, setAllParticipants] = useState<
    Array<ReactElement<VideoParticipantProps>>
  >([]);
  const [pinParticipant, setPinParticipant] = useState<
    ReactElement<VideoParticipantProps> | undefined
  >(undefined);
  const [totalNumWebcams, setTotalNumWebcams] = useState<number>(0);
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

  useEffect(() => {
    if (!pinCamUserId && pinParticipant) {
      setPinParticipant(undefined);
    }
  }, [pinCamUserId, pinParticipant]);

  useEffect(() => {
    if (!videoSubscribers) {
      return;
    }

    let totalNumWebcams = 0;
    const localSubscribers: Array<ReactElement<VideoParticipantProps>> = [];
    let pinSubscribers: ReactElement<VideoParticipantProps> | undefined =
      undefined;
    const adminSubscribers: Array<ReactElement<VideoParticipantProps>> = [];
    const otherSubscribers: Array<ReactElement<VideoParticipantProps>> = [];

    for (const participant of videoSubscribers.values()) {
      // we will only take if source from Camera
      const videoTracks = participant.getTrackPublication(Track.Source.Camera);
      if (videoTracks) {
        let isAdmin = false,
          displayPinIcon = true,
          displaySwitchCamIcon = true;

        if (participant.metadata && participant.metadata !== '') {
          const metadata: ICurrentUserMetadata = JSON.parse(
            participant.metadata,
          );
          isAdmin = metadata.isAdmin;
        }

        const participantType: VideoParticipantType = {
          isAdmin,
          isLocal: participant instanceof LocalParticipant,
        };

        if (videoSubscribers.size == 1) {
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

    if (totalNumWebcams > 1 && pinSubscribers) {
      // only then we can activate pin cam
      setPinParticipant(pinSubscribers);
    } else if (pinSubscribers) {
      // otherwise treat as normal
      allParticipants.push(pinSubscribers);
      dispatch(updatePinCamUserId(undefined));
    }

    setAllParticipants(allParticipants);
    setTotalNumWebcams(totalNumWebcams);
  }, [videoSubscribers, pinCamUserId, dispatch]);

  return (
    <VideosComponentElms
      allParticipants={allParticipants}
      pinParticipant={pinParticipant}
      totalNumWebcams={totalNumWebcams}
      isVertical={isVertical}
    />
  );
};

export default VideosComponent;
