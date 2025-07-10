import React, { ReactElement, useEffect, useMemo, useState } from 'react';
import {
  RemoteParticipant,
  LocalParticipant,
  RemoteAudioTrack,
} from 'livekit-client';

import AudioElm from './audio';
import { CurrentConnectionEvents } from '../../../helpers/livekit/types';
import { getMediaServerConn } from '../../../helpers/livekit/utils';

const AudioElements = () => {
  const [audioSubscribers, setAudioSubscribers] =
    useState<Map<string, RemoteParticipant | LocalParticipant>>();
  const currentConnection = getMediaServerConn();

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
    const elms: Array<ReactElement> = [];
    audioSubscribers.forEach((participant) => {
      participant.audioTrackPublications.forEach((track) => {
        if (track.audioTrack && track.audioTrack instanceof RemoteAudioTrack) {
          elms.push(
            <AudioElm
              userId={participant.identity}
              name={participant.name ?? ''}
              audioTrack={track.audioTrack}
              key={track.trackSid}
            />,
          );
        }
      });
    });

    return elms;
  }, [audioSubscribers]);

  return <>{renderElms}</>;
};

export default AudioElements;
