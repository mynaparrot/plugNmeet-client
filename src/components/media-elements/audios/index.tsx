import React, { ReactElement, useEffect, useMemo, useState } from 'react';
import { RemoteAudioTrack } from 'livekit-client';

import AudioElm from './audio';
import {
  CurrentConnectionEvents,
  ISubscriberInfo,
} from '../../../helpers/livekit/types';
import { getMediaServerConn } from '../../../helpers/livekit/utils';

const AudioElements = () => {
  const [audioSubscribers, setAudioSubscribers] =
    useState<Map<string, ISubscriberInfo>>();
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
    audioSubscribers.forEach((subscriber) => {
      const track = subscriber.track;
      if (track.audioTrack && track.audioTrack instanceof RemoteAudioTrack) {
        elms.push(
          <AudioElm
            userId={subscriber.user.userId}
            audioTrack={track.audioTrack}
            key={track.trackSid}
          />,
        );
      }
    });

    return elms;
  }, [audioSubscribers]);
};

export default AudioElements;
