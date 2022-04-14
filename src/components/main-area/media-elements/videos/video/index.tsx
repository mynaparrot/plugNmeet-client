import React from 'react';
import { LocalTrackPublication, RemoteTrackPublication } from 'livekit-client';
import VideoElm from './videoElm';
import ConnectionStatus from './connectionStatus';
import MicStatus from './micStatus';

export interface IVideoComponentProps {
  userId: string;
  track: RemoteTrackPublication | LocalTrackPublication;
}
const VideoComponent = ({ userId, track }: IVideoComponentProps) => {
  const render = () => {
    return (
      <>
        <ConnectionStatus userId={userId} />
        <MicStatus userId={userId} />
        <VideoElm track={track} />
      </>
    );
  };
  return <div className="camera-modules">{render()}</div>;
};

export default React.memo(VideoComponent);
