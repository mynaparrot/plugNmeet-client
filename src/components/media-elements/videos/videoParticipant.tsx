import React, { useEffect, useMemo, useReducer, useState } from 'react';
import {
  LocalParticipant,
  ParticipantEvent,
  RemoteParticipant,
  RemoteTrackPublication,
  Track,
} from 'livekit-client';

import VideoComponent from './video';
import Participant from './video/participant';
import { useAppSelector } from '../../../store';
import { selectIsSpeakingByUserId } from '../../../store/slices/activeSpeakersSlice';
import { VideoParticipantType } from './';
import { RepeatIconSVG } from '../../../assets/Icons/RepeatIconSVG';
import { generateAvatarInitial } from '../../../helpers/utils';

export interface VideoParticipantProps {
  participantType: VideoParticipantType;
  userId: string;
  participant: RemoteParticipant | LocalParticipant;
  displayPinIcon: boolean;
  displaySwitchCamIcon: boolean;
}
const VideoParticipant = ({
  participantType,
  userId,
  participant,
  displayPinIcon,
  displaySwitchCamIcon,
}: VideoParticipantProps) => {
  const isSpeaking = useAppSelector(selectIsSpeakingByUserId(userId));
  const activateWebcamsView = useAppSelector(
    (state) => state.roomSettings.activateWebcamsView,
  );
  const [floatView, setFloatView] = useState<boolean>(true);

  const [version, forceUpdate] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    participant.on(ParticipantEvent.TrackMuted, forceUpdate);
    participant.on(ParticipantEvent.TrackUnmuted, forceUpdate);
    return () => {
      participant.off(ParticipantEvent.TrackMuted, forceUpdate);
      participant.off(ParticipantEvent.TrackUnmuted, forceUpdate);
    };
  }, [participant]);

  useEffect(() => {
    for (const track of participant.videoTrackPublications.values()) {
      if (
        track.source === Track.Source.Camera &&
        track instanceof RemoteTrackPublication
      ) {
        track.setEnabled(activateWebcamsView);
      }
    }
  }, [participant, activateWebcamsView]);

  const renderVideoElms = useMemo(() => {
    const elements: Array<React.ReactNode> = [];
    for (const track of participant.videoTrackPublications.values()) {
      if (track.source !== Track.Source.Camera) {
        continue;
      }
      const isRemote = track instanceof RemoteTrackPublication;
      const showVideo =
        !track.isMuted &&
        track.videoTrack &&
        (!isRemote || activateWebcamsView);
      if (showVideo) {
        elements.push(
          <VideoComponent
            userId={userId}
            name={participant.name ?? ''}
            isLocal={participantType.isLocal}
            track={track}
            displayPinIcon={displayPinIcon}
            key={userId}
          />,
        );
      } else {
        elements.push(
          <div
            key={userId}
            className="camera-muted-fallback relative w-full h-full flex items-center justify-center bg-black"
          >
            <span className="avatar-initial font-bold text-white select-none">
              {generateAvatarInitial(participant.name ?? '')}
            </span>
            <Participant
              userId={userId}
              name={participant.name ?? ''}
              isLocal={participantType.isLocal}
            />
          </div>,
        );
      }
    }
    return elements;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    participant,
    displayPinIcon,
    participantType,
    version,
    activateWebcamsView,
  ]);

  return (
    <div
      className={`video-camera-item relative group ${isSpeaking ? 'speaking' : ''} ${
        participantType.isAdmin ? 'admin' : 'participants'
      } ${participantType.isLocal && floatView ? 'its-me' : ''}`}
    >
      {participantType.isLocal && displaySwitchCamIcon && (
        <>
          <button
            type="button"
            className="switch-camera absolute top-3 start-4 z-50 text-white cursor-pointer h-7 w-7 rounded-full hidden items-center justify-center bg-black bg-opacity-50 focus-ring"
            onClick={() => setFloatView(!floatView)}
          >
            <RepeatIconSVG />
          </button>
        </>
      )}
      {renderVideoElms}
      <div className="bg-shadow pointer-events-none bg-linear-to-b from-95% from-black/0 to-black/50 w-full h-full absolute bottom-0 start-0 opacity-0 transition-all duration-300 group-hover:opacity-100"></div>
    </div>
  );
};

export default VideoParticipant;
