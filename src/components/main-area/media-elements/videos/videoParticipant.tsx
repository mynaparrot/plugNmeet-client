import React from 'react';
import { LocalParticipant, RemoteParticipant, Track } from 'livekit-client';

import { VideoParticipantType } from './index';
import VideoComponent from './video';
import { useAppSelector } from '../../../../store';
import { activeSpeakersSelector } from '../../../../store/slices/activeSpeakersSlice';

interface VideoParticipantProps {
  participantType: VideoParticipantType;
  participant: RemoteParticipant | LocalParticipant;
}
const VideoParticipant = ({
  participantType,
  participant,
}: VideoParticipantProps) => {
  const isSpeaking = useAppSelector((state) =>
    activeSpeakersSelector.selectById(state, participant.identity),
  );

  const render = () => {
    const elements: Array<JSX.Element> = [];
    participant.tracks.forEach((track) => {
      if (track.source === Track.Source.Camera) {
        const elm = (
          <div className="video-camera-item-inner" key={track.trackSid}>
            <div className="name">
              {participant.name} {participantType.isLocal ? '(me)' : null}
            </div>
            <VideoComponent userId={participant.identity} track={track} />
          </div>
        );
        elements.push(elm);
      }
    });
    return elements;
  };

  return (
    <div
      className={`video-camera-item relative ${isSpeaking ? 'speaking' : ''} ${
        participantType.isAdmin ? 'admin' : 'participants'
      }`}
    >
      {render()}
    </div>
  );
};

export default VideoParticipant;
