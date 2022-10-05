import React, { useMemo } from 'react';
import { concat, isEmpty } from 'lodash';
import { LocalParticipant, RemoteParticipant, Track } from 'livekit-client';

import VideoParticipant from '../main-video-view/videoParticipant';
import { VideoParticipantType } from '../main-video-view';
import { ICurrentUserMetadata } from '../../../../store/slices/interfaces/session';

const useVideoParticipant = (
  videoSubscribers: Map<string, LocalParticipant | RemoteParticipant>,
) => {
  const [allParticipants, totalNumWebcams] = useMemo(() => {
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
    return [allParticipants, totalNumWebcams];
  }, [videoSubscribers]);

  return {
    allParticipants,
    totalNumWebcams,
  };
};

export default useVideoParticipant;
