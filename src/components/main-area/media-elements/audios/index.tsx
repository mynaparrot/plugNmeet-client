import React, { useState, useEffect } from 'react';
import { RemoteParticipant, LocalParticipant } from 'livekit-client';
import AudioElm from './audio';

interface IAudioElementsProps {
  audioSubscribers: Map<string, RemoteParticipant | LocalParticipant>;
}
const AudioElements = ({ audioSubscribers }: IAudioElementsProps) => {
  const [elements, setElements] = useState<Array<JSX.Element>>([]);

  useEffect(() => {
    const elm: Array<JSX.Element> = [];
    audioSubscribers.forEach((participant) => {
      participant.tracks.forEach((track) => {
        elm.push(<AudioElm track={track} key={track.trackSid} />);
      });
    });

    setElements(elm);
  }, [audioSubscribers]);

  return <React.Fragment>{elements.length ? elements : null}</React.Fragment>;
};

export default React.memo(AudioElements);
