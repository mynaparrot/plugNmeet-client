import React, { useMemo } from 'react';
import { RemoteParticipant, LocalParticipant } from 'livekit-client';
import AudioElm from './audio';

interface IAudioElementsProps {
  audioSubscribers: Map<string, RemoteParticipant | LocalParticipant>;
}
const AudioElements = ({ audioSubscribers }: IAudioElementsProps) => {
  const renderElms = useMemo(() => {
    const elms: Array<JSX.Element> = [];
    audioSubscribers.forEach((participant) => {
      participant.tracks.forEach((track) => {
        elms.push(
          <AudioElm
            userId={participant.identity}
            track={track}
            key={track.trackSid}
          />,
        );
      });
    });

    return elms;
  }, [audioSubscribers]);

  return <>{renderElms}</>;
};

export default AudioElements;
