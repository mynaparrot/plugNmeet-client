import React, { ReactElement, useEffect, useMemo, useState } from 'react';
import {
  LocalParticipant,
  RemoteAudioTrack,
  RemoteParticipant,
} from 'livekit-client';

import AudioElm from './audio';
import { CurrentConnectionEvents } from '../../../helpers/livekit/types';
import { getMediaServerConn } from '../../../helpers/livekit/utils';
import { toPlugNmeetUserId } from '../../../helpers/utils';

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

  return useMemo(() => {
    if (!audioSubscribers) {
      return null;
    }
    const elms: Array<ReactElement> = [];
    audioSubscribers.forEach((participant) => {
      participant.audioTrackPublications.forEach((track) => {
        if (track.audioTrack && track.audioTrack instanceof RemoteAudioTrack) {
          const userId = toPlugNmeetUserId(participant.identity);
          elms.push(
            <AudioElm
              userId={userId}
              audioTrack={track.audioTrack}
              key={track.trackSid}
            />,
          );
        }
      });
    });

    return elms;
  }, [audioSubscribers]);
};

export default AudioElements;
