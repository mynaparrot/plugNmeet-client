import React, { useMemo } from 'react';
import { LocalParticipant, RemoteParticipant, Track } from 'livekit-client';

import VideoComponent from './video';
import { useAppSelector } from '../../../store';
import { activeSpeakersSelector } from '../../../store/slices/activeSpeakersSlice';
import { VideoParticipantType } from './videosComponentElms';

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
    const elements: Array<React.JSX.Element> = [];

    for (const [, track] of participant.videoTrackPublications) {
      if (track.source === Track.Source.Camera) {
        const elm = (
          <div
            className="video-camera-item-inner w-full h-full relative"
            key={track.trackSid}
          >
            <div className="name absolute bottom-4 left-4 text-sm font-medium text-white z-10">
              {participant.name} {participantType.isLocal ? '(me)' : null}
            </div>
            <VideoComponent userId={participant.identity} track={track} />
          </div>
        );
        elements.push(elm);
      }
    }
    return elements;
    //eslint-disable-next-line
  }, [participant]);

  return (
    <div
      className={`video-camera-item relative group ${isSpeaking ? 'speaking' : ''} ${
        participantType.isAdmin ? 'admin' : 'participants'
      } ${participantType.isLocal ? 'its-me' : ''}`}
    >
      {renderVideoElms}
      <div className="bg-shadow pointer-events-none bg-gradient-to-b from-95% from-black/0 to-black/50 w-full h-full absolute bottom-0 left-0 opacity-0 transition-all duration-300 group-hover:opacity-100"></div>
    </div>
  );
};

export default VideoParticipant;
