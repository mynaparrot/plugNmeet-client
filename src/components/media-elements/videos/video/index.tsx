import React from 'react';
import {
  LocalTrackPublication,
  RemoteTrackPublication,
  RemoteParticipant,
  LocalParticipant,
} from 'livekit-client';
import VideoElm from './videoElm';
// import ConnectionStatus from './connectionStatus';
// import MicStatus from './micStatus';
// import PinWebcam from './pinWebcam';
import { VideoParticipantType } from '../videosComponentElms';

export interface IVideoComponentProps {
  userId: string;
  track: RemoteTrackPublication | LocalTrackPublication;
  participantType: VideoParticipantType;
  participant: RemoteParticipant | LocalParticipant;
}
const VideoComponent = ({
  userId,
  track,
  participantType,
  participant,
}: IVideoComponentProps) => {
  const render = () => {
    return (
      <>
        {/* <div className="status">
          <ConnectionStatus userId={userId} />
          <MicStatus userId={userId} />
        </div>
        <div className="status PinWebcam">
          <PinWebcam userId={userId} />
        </div> */}
        <VideoElm
          track={track}
          userId={userId}
          participantType={participantType}
          participant={participant}
        />
      </>
    );
  };
  return <div className="camera-modules">{render()}</div>;
};

export default VideoComponent;
