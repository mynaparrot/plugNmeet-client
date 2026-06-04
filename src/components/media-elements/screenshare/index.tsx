import React, { ReactElement, useEffect, useMemo, useState } from 'react';
import { RemoteAudioTrack, Track } from 'livekit-client';

import VideoElm from './videoElm';
import AudioElm from './audioElm';
import {
  CurrentConnectionEvents,
  ISubscriberInfo,
} from '../../../helpers/livekit/types';
import { getMediaServerConn } from '../../../helpers/livekit/utils';

const ScreenShareElements = () => {
  const [screenShareTracks, setScreenShareTracks] =
    useState<Map<string, Array<ISubscriberInfo>>>();
  const currentConnection = getMediaServerConn();

  useEffect(() => {
    if (currentConnection.screenShareTracksMap.size) {
      setScreenShareTracks(currentConnection.screenShareTracksMap);
    }
    currentConnection.on(
      CurrentConnectionEvents.ScreenShareTracks,
      setScreenShareTracks,
    );
    return () => {
      currentConnection.off(
        CurrentConnectionEvents.ScreenShareTracks,
        setScreenShareTracks,
      );
    };
  }, [currentConnection]);

  return useMemo(() => {
    if (screenShareTracks) {
      const elm = Array<ReactElement>();

      screenShareTracks.forEach((subscriberInfos) => {
        subscriberInfos.forEach((subscriberInfo) => {
          const track = subscriberInfo.track;
          if (track.source === Track.Source.ScreenShare) {
            elm.push(<VideoElm key={track.trackSid} track={track} />);
          } else if (
            track.source === Track.Source.ScreenShareAudio &&
            track.audioTrack &&
            track.audioTrack instanceof RemoteAudioTrack
          ) {
            // we won't add local screen share audio track to avoid eco
            elm.push(
              <AudioElm key={track.trackSid} audioTrack={track.audioTrack} />,
            );
          }
        });
      });

      return elm;
    } else {
      return null;
    }
  }, [screenShareTracks]);
};

export default ScreenShareElements;
