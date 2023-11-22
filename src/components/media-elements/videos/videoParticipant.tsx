import React, { useMemo } from 'react';
import { LocalParticipant, RemoteParticipant, Track } from 'livekit-client';

import type { VideoParticipantType } from './videosComponentElms';
import VideoComponent from './video';
import { useAppSelector } from '../../../store';
import { activeSpeakersSelector } from '../../../store/slices/activeSpeakersSlice';

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

  const renderVideoElms = useMemo(() => {
    const elements: Array<JSX.Element> = [];
    participant.tracks.forEach((track) => {
      if (track.source === Track.Source.Camera) {
        elements.push(
          <VideoComponent
            key={track.trackSid}
            participant={participant}
            participantType={participantType}
            track={track}
          />,
        );
      }
    });
    return elements;
    //eslint-disable-next-line
  }, [participant]);

  return (
    <div
      className={`video-camera-item relative ${isSpeaking ? 'speaking' : ''} ${
        participantType.isAdmin ? 'admin' : 'participants'
      }`}
    >
      {renderVideoElms}
    </div>
  );
};

export default VideoParticipant;
