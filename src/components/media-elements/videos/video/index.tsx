import React from 'react';
import type {
  LocalParticipant,
  LocalTrackPublication,
  RemoteParticipant,
  RemoteTrackPublication,
} from 'livekit-client';

import type { VideoParticipantType } from '../videosComponentElms';
import VideoElm from './videoElm';
import ConnectionStatus from './connectionStatus';
import MicStatus from './micStatus';
import PinWebcam from './pinWebcam';

export interface IVideoComponentProps {
  participant: RemoteParticipant | LocalParticipant;
  participantType: VideoParticipantType;
  track: RemoteTrackPublication | LocalTrackPublication;
}
const VideoComponent = ({
  participant,
  participantType,
  track,
}: IVideoComponentProps) => {
  return (
    <div className="video-camera-item-inner">
      <div className="name">
        {participant.name} {participantType.isLocal ? '(me)' : null}
      </div>
      <div className="camera-modules">
        <div className="status">
          <ConnectionStatus userId={participant.identity} />
          <MicStatus userId={participant.identity} />
        </div>
        <div className="status PinWebcam">
          <PinWebcam userId={participant.identity} />
        </div>
        <VideoElm track={track} />
      </div>
    </div>
  );
};

export default VideoComponent;
