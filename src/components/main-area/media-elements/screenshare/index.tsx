import React from 'react';
import {
  LocalTrackPublication,
  RemoteTrackPublication,
  Track,
  LocalParticipant,
  RemoteParticipant,
} from 'livekit-client';

import VideoElm from './videoElm';
import AudioElm from './audioElm';
import VerticalWebcams from '../vertical-webcams';

interface IScreenShareElementsProps {
  videoSubscribers?: Map<string, LocalParticipant | RemoteParticipant>;
  screenShareTracks: Map<
    string,
    LocalTrackPublication | RemoteTrackPublication
  >;
}

const ScreenShareElements = ({
  screenShareTracks,
  videoSubscribers,
}: IScreenShareElementsProps) => {
  const render = () => {
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
  };

  return (
    <div className="share-screen-wrapper is-share-screen-running">
      {/*{if videoSubscribers has webcams}*/}
      <VerticalWebcams videoSubscribers={videoSubscribers} />

      {render()}
    </div>
  );
};

export default React.memo(ScreenShareElements);
