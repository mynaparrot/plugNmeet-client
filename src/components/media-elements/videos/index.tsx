import React, { useEffect, useState } from 'react';
import { LocalParticipant, RemoteParticipant, Track } from 'livekit-client';
import { concat, isEmpty } from 'lodash';

import { store, useAppSelector } from '../../../store';
import { ICurrentUserMetadata } from '../../../store/slices/interfaces/session';
import { participantsSelector } from '../../../store/slices/participantSlice';
import VideosComponentElms, {
  VideoParticipantType,
} from './videosComponentElms';
import VideoParticipant from './videoParticipant';
import { CurrentConnectionEvents } from '../../../helpers/livekit/types';
import { getMediaServerConn } from '../../../helpers/livekit/utils';

interface IVideosComponentProps {
  isVertical?: boolean;
}

const VideosComponent = ({ isVertical }: IVideosComponentProps) => {
  const refreshWebcams = useAppSelector(
    (state) => state.roomSettings.refreshWebcams,
  );
  const [videoSubscribers, setVideoSubscribers] =
    useState<Map<string, LocalParticipant | RemoteParticipant>>();
  const [allParticipants, setAllParticipants] = useState<
    Array<React.JSX.Element>
  >([]);
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
    if (!videoSubscribers) {
      return;
    }

    let totalNumWebcams = 0;
    const localSubscribers: Array<React.JSX.Element> = [];
    const adminPinSubscribers: Array<React.JSX.Element> = [];
    const adminSubscribers: Array<React.JSX.Element> = [];
    const otherPinSubscribers: Array<React.JSX.Element> = [];
    const otherSubscribers: Array<React.JSX.Element> = [];

    videoSubscribers.forEach((participant) => {
      // we will only take if source from Camera
      const videoTracks = participant
        .getTrackPublications()
        .filter((track) => track.source === Track.Source.Camera);

      if (videoTracks.length) {
        let isAdmin = false;
        const pinWebcam = participantsSelector.selectById(
          store.getState(),
          participant.identity,
        ).pinWebcam;

        if (participant.metadata && !isEmpty(participant.metadata)) {
          const metadata: ICurrentUserMetadata = JSON.parse(
            participant.metadata,
          );
          isAdmin = metadata.isAdmin;
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
