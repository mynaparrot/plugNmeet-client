import React, { useMemo } from 'react';
import throttle from 'lodash/throttle';

import { useAppSelector } from '../../store';
import { selectSpeakingParticipants } from '../../store/slices/activeSpeakersSlice';
import { participantsSelector } from '../../store/slices/participantSlice';
import SpeakerComponent from './speaker';
import { getMediaServerConn } from '../../helpers/livekit/utils';
import { IActiveSpeaker } from '../../store/slices/interfaces/activeSpeakers';

const ACTIVE_SPEAKER_VIDEO_REARRANGE_DURATION = 4000;

const ActiveSpeakers = () => {
  const activeSpeakers = useAppSelector(selectSpeakingParticipants);
  const participantIds = useAppSelector(participantsSelector.selectIds);
  const room = getMediaServerConn();

  const reOrderWebcams = throttle((activeSpeakers: IActiveSpeaker[]) => {
    if (typeof room === 'undefined' || !activeSpeakers.length) {
      return;
    }
    if (room.videoSubscribersMap.size < 3) {
      // no need to update
      return;
    }

    for (let i = 0; i < activeSpeakers.length; i++) {
      const speaker = activeSpeakers[i];
      const participant = room.room.getParticipantByIdentity(speaker.userId);
      // if this use has video then we can update to reorder
      if (participant && participant.videoTrackPublications.size) {
        room.addVideoSubscriber(participant);
      }
    }
  }, ACTIVE_SPEAKER_VIDEO_REARRANGE_DURATION);

  const activeSpeakersElms = useMemo(() => {
    if (!activeSpeakers.length) {
      return null;
    }
    reOrderWebcams(activeSpeakers);
    return activeSpeakers.map((speaker) => {
      if (participantIds.find((p) => p === String(speaker.userId))) {
        return <SpeakerComponent key={speaker.userId} speaker={speaker} />;
      }
    });
    //eslint-disable-next-line
  }, [activeSpeakers, participantIds]);

  return activeSpeakersElms ? (
    <div className="active-speakers-wrap flex w-full items-center justify-center absolute top-0 left-0 z-9999">
      {activeSpeakersElms}
    </div>
  ) : null;
};

export default ActiveSpeakers;
