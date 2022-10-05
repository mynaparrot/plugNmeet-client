import React, { useEffect, useMemo, useState } from 'react';
import { RemoteParticipant, LocalParticipant } from 'livekit-client';

import AudioElm from './audio';
import {
  CurrentConnectionEvents,
  IConnectLivekit,
} from '../../../helpers/livekit/types';

interface IAudioElementsProps {
  currentConnection: IConnectLivekit;
}
const AudioElements = ({ currentConnection }: IAudioElementsProps) => {
  const [audioSubscribers, setAudioSubscribers] =
    useState<Map<string, RemoteParticipant | LocalParticipant>>();

  useEffect(() => {
    if (currentConnection.audioSubscribersMap.size) {
      setAudioSubscribers(currentConnection.audioSubscribersMap);
    }
    currentConnection.on(
      CurrentConnectionEvents.AudioSubscribers,
      setAudioSubscribers,
    );
    return () => {
      currentConnection.off(
        CurrentConnectionEvents.AudioSubscribers,
        setAudioSubscribers,
      );
    };
  }, [currentConnection]);

  const renderElms = useMemo(() => {
    if (!audioSubscribers) {
      return null;
    }
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
