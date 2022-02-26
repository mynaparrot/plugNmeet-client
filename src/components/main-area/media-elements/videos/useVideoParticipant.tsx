import React, { useEffect, useState } from 'react';
import { LocalParticipant, RemoteParticipant, Track } from 'livekit-client';
import { ICurrentUserMetadata } from '../../../../store/slices/interfaces/session';
import VideoParticipant from './videoParticipant';
import { VideoParticipantType } from './index';

const useVideoParticipant = (
  videoSubscribers: Map<string, LocalParticipant | RemoteParticipant>,
) => {
  const [allParticipants, setAllParticipants] = useState<Array<JSX.Element>>(
    [],
  );
  const [totalNumWebcams, setTotalNumWebcams] = useState<number>(0);

  useEffect(() => {
    let totalNumWebcams = 0;
    const participants: Array<JSX.Element> = [];

    videoSubscribers.forEach((participant) => {
      if (participant.metadata) {
        const metadata: ICurrentUserMetadata = JSON.parse(participant.metadata);

        const participantType: VideoParticipantType = {
          isAdmin: metadata.is_admin ?? false,
          isLocal: participant instanceof LocalParticipant,
        };
        const videoTracks = participant
          .getTracks()
          .filter((track) => track.source === Track.Source.Camera);

        totalNumWebcams = totalNumWebcams + videoTracks.length;
        if (videoTracks.length) {
          const elm = (
            <VideoParticipant
              key={participant.sid}
              participantType={participantType}
              participant={participant}
            />
          );
          participants.push(elm);
        }
      }
    });

    setTotalNumWebcams(totalNumWebcams);
    setAllParticipants(participants);
  }, [videoSubscribers]);

  return {
    allParticipants,
    totalNumWebcams,
  };
};

export default useVideoParticipant;
