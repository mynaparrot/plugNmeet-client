import React from 'react';
import { LocalTrackPublication, RemoteTrackPublication } from 'livekit-client';
import VideoElm from './videoElm';
import ConnectionStatus from './connectionStatus';
import MicStatus from './micStatus';
import PinWebcam from './pinWebcam';

export interface IVideoComponentProps {
  userId: string;
  track: RemoteTrackPublication | LocalTrackPublication;
}
const VideoComponent = ({ userId, track }: IVideoComponentProps) => {
  const render = () => {
    return (
      <>
        <div className="status">
          <ConnectionStatus userId={userId} />
          <MicStatus userId={userId} />
        </div>
        <div className="status PinWebcam">
          <PinWebcam userId={userId} />
        </div>
        <VideoElm track={track} />
      </>
    );
  };
  return <div className="camera-modules">{render()}</div>;
};

export default VideoComponent;
