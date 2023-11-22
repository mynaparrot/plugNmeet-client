import React, { useEffect, useState } from 'react';
import type {
  LocalParticipant,
  LocalTrackPublication,
  RemoteParticipant,
  RemoteTrackPublication,
  Track,
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
  const [videoDimension, setVideoDimension] = useState<Track.Dimensions>({
    height: 720,
    width: 1280,
  });

  useEffect(() => {
    if (track.videoTrack) {
      track.videoTrack.on('videoDimensionsChanged', setVideoDimension);
    }

    return () => {
      if (track.videoTrack) {
        track.videoTrack.off('videoDimensionsChanged', setVideoDimension);
      }
    };
  }, []);

  return (
    <div
      className="video-camera-item-inner"
      style={{
        height: `${videoDimension.height}px`,
        width: `${videoDimension.width}px`,
        maxWidth: '1280px',
        maxHeight: '720px',
      }}
    >
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
