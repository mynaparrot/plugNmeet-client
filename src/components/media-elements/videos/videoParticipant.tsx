import React, { useMemo, useState } from 'react';
import {
  LocalTrackPublication,
  RemoteTrackPublication,
  Track,
} from 'livekit-client';

import VideoComponent from './video';
import { useAppSelector } from '../../../store';
import { selectIsSpeakingByUserId } from '../../../store/slices/activeSpeakersSlice';
import { VideoParticipantType } from './';
import { RepeatIconSVG } from '../../../assets/Icons/RepeatIconSVG';
import { IParticipant } from '../../../store/slices/interfaces/participant';

export interface VideoParticipantProps {
  participantType: VideoParticipantType;
  user: IParticipant;
  track: LocalTrackPublication | RemoteTrackPublication;
  displayPinIcon: boolean;
  displaySwitchCamIcon: boolean;
}
const VideoParticipant = ({
  participantType,
  user,
  track,
  displayPinIcon,
  displaySwitchCamIcon,
}: VideoParticipantProps) => {
  const isSpeaking = useAppSelector(selectIsSpeakingByUserId(user.userId));
  const [floatView, setFloatView] = useState<boolean>(true);

  const renderVideoElms = useMemo(() => {
    const elements: Array<React.ReactNode> = [];

    if (
      track.source === Track.Source.Camera &&
      !track.isMuted &&
      track.videoTrack
    ) {
      const elm = (
        <VideoComponent
          userId={user.userId}
          name={user.name}
          isLocal={participantType.isLocal}
          track={track}
          displayPinIcon={displayPinIcon}
          key={track.trackSid}
        />
      );
      elements.push(elm);
    }

    return elements;
  }, [displayPinIcon, user, track, participantType]);

  return (
    <div
      className={`video-camera-item relative group ${isSpeaking ? 'speaking' : ''} ${
        participantType.isAdmin ? 'admin' : 'participants'
      } ${participantType.isLocal && floatView ? 'its-me' : ''}`}
    >
      {participantType.isLocal && displaySwitchCamIcon && (
        <>
          <div
            className="switch-camera absolute top-3 left-4 z-50 text-white cursor-pointer h-7 w-7 rounded-full hidden items-center justify-center bg-black bg-opacity-50"
            onClick={() => setFloatView(!floatView)}
          >
            <RepeatIconSVG />
          </div>
        </>
      )}
      {renderVideoElms}
      <div className="bg-shadow pointer-events-none bg-linear-to-b from-95% from-black/0 to-black/50 w-full h-full absolute bottom-0 left-0 opacity-0 transition-all duration-300 group-hover:opacity-100"></div>
    </div>
  );
};

export default VideoParticipant;
