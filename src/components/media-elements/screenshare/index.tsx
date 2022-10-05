import React, { useMemo } from 'react';
import {
  LocalTrackPublication,
  RemoteTrackPublication,
  Track,
} from 'livekit-client';

import VideoElm from './videoElm';
import AudioElm from './audioElm';

interface IScreenShareElementsProps {
  screenShareTracks: Map<
    string,
    LocalTrackPublication | RemoteTrackPublication
  >;
}

const ScreenShareElements = ({
  screenShareTracks,
}: IScreenShareElementsProps) => {
  const renderElms = useMemo(() => {
    if (screenShareTracks) {
      const elm = Array<JSX.Element>();

      screenShareTracks.forEach((track) => {
        if (track.source === Track.Source.ScreenShare) {
          elm.push(<VideoElm key={track.trackSid} track={track} />);
        } else if (track.source === Track.Source.ScreenShareAudio) {
          elm.push(
            <AudioElm
              key={track.trackSid}
              track={track as RemoteTrackPublication}
            />,
          );
        }
      });

      return elm;
    } else {
      return null;
    }
  }, [screenShareTracks]);

  return <>{renderElms ?? null}</>;
};

export default ScreenShareElements;
