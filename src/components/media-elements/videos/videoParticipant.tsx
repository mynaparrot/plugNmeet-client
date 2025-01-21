import React, { useMemo, useState } from 'react';
import { LocalParticipant, RemoteParticipant, Track } from 'livekit-client';

import VideoComponent from './video';
import { useAppSelector } from '../../../store';
import { activeSpeakersSelector } from '../../../store/slices/activeSpeakersSlice';
import { VideoParticipantType } from './videosComponentElms';
import { RepeatIconSVG } from '../../../assets/Icons/RepeatIconSVG';

interface VideoParticipantProps {
  participantType: VideoParticipantType;
  participant: RemoteParticipant | LocalParticipant;
  displayPinIcon: boolean;
  displaySwitchCamIcon: boolean;
}
const VideoParticipant = ({
  participantType,
  participant,
  displayPinIcon,
  displaySwitchCamIcon,
}: VideoParticipantProps) => {
  const isSpeaking = useAppSelector((state) =>
    activeSpeakersSelector.selectById(state, participant.identity),
  );
  const [floatView, setFloatView] = useState<boolean>(true);

  const renderVideoElms = useMemo(() => {
    const elements: Array<React.ReactNode> = [];

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
            <VideoComponent
              userId={participant.identity}
              track={track}
              displayPinIcon={displayPinIcon}
            />
          </div>
        );
        elements.push(elm);
      }
    }
    return elements;
    //eslint-disable-next-line
  }, [participant, displayPinIcon]);

  return (
    <div
      className={`video-camera-item relative group ${isSpeaking ? 'speaking' : ''} ${
        participantType.isAdmin ? 'admin' : 'participants'
      } ${participantType.isLocal && floatView ? 'its-me' : ''}`}
    >
      {participantType.isLocal && displaySwitchCamIcon ? (
        <>
          <div
            className="switch-camera absolute top-3 left-4 z-50 text-white cursor-pointer h-7 w-7 rounded-full flex items-center justify-center bg-black bg-opacity-50"
            onClick={() => setFloatView(!floatView)}
          >
            <RepeatIconSVG />
          </div>
        </>
      ) : null}
      {renderVideoElms}
      <div className="bg-shadow pointer-events-none bg-gradient-to-b from-95% from-black/0 to-black/50 w-full h-full absolute bottom-0 left-0 opacity-0 transition-all duration-300 group-hover:opacity-100"></div>
    </div>
  );
};

export default VideoParticipant;
