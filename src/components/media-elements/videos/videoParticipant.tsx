import React, { useMemo } from 'react';
import { LocalParticipant, RemoteParticipant, Track } from 'livekit-client';

import VideoComponent from './video';
import { useAppSelector } from '../../../store';
import { activeSpeakersSelector } from '../../../store/slices/activeSpeakersSlice';
import { VideoParticipantType } from './videosComponentElms';
import { RepeatIconSVG } from '../../../assets/Icons/RepeatIconSVG';
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

    for (const track of participant.videoTrackPublications.values()) {
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
      {participantType.isLocal ? (
        <>
          <div className="switch-camera absolute top-3 left-4 z-50 text-white cursor-pointer h-7 w-7 rounded-full flex items-center justify-center bg-black bg-opacity-50">
            <RepeatIconSVG />
          </div>
        </>
      ) : (
        ''
      )}
      {renderVideoElms}
      <div className="bg-shadow pointer-events-none bg-gradient-to-b from-95% from-black/0 to-black/50 w-full h-full absolute bottom-0 left-0 opacity-0 transition-all duration-300 group-hover:opacity-100"></div>
    </div>
  );
};

export default VideoParticipant;
