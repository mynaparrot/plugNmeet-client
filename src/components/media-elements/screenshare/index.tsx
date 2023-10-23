import React, { useEffect, useMemo, useState } from 'react';
import {
  LocalTrackPublication,
  RemoteTrackPublication,
  Track,
} from 'livekit-client';

import VideoElm from './videoElm';
import AudioElm from './audioElm';
import {
  CurrentConnectionEvents,
  IConnectLivekit,
} from '../../../helpers/livekit/types';

interface IScreenShareElementsProps {
  currentConnection: IConnectLivekit;
}

const ScreenShareElements = ({
  currentConnection,
}: IScreenShareElementsProps) => {
  const [screenShareTracks, setScreenShareTracks] =
    useState<
      Map<string, Array<LocalTrackPublication | RemoteTrackPublication>>
    >();

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

  const renderElms = useMemo(() => {
    if (screenShareTracks) {
      const elm = Array<JSX.Element>();

      screenShareTracks.forEach((tracks) => {
        tracks.forEach((track) => {
          if (track.source === Track.Source.ScreenShare) {
            elm.push(<VideoElm key={track.trackSid} track={track} />);
          } else if (
            track.source === Track.Source.ScreenShareAudio &&
            track instanceof RemoteTrackPublication
          ) {
            // we won't add local screen share audio track to avoid eco
            elm.push(<AudioElm key={track.trackSid} track={track} />);
          }
        });
      });

      return elm;
    } else {
      return null;
    }
  }, [screenShareTracks]);

  return <>{renderElms ?? null}</>;
};

export default ScreenShareElements;
