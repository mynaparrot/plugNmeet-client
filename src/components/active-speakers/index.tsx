import React, { useEffect, useMemo } from 'react';
import { throttle } from 'es-toolkit';

import { useAppSelector } from '../../store';
import { selectSpeakingParticipants } from '../../store/slices/activeSpeakersSlice';
import { participantsSelector } from '../../store/slices/participantSlice';
import SpeakerComponent from './speaker';
import { getMediaServerConn } from '../../helpers/livekit/utils';
import { IActiveSpeaker } from '../../store/slices/interfaces/activeSpeakers';

const ACTIVE_SPEAKER_VIDEO_REARRANGE_DURATION = 4000;

const reOrderWebcams = throttle(
  (speakers: IActiveSpeaker[], room: ReturnType<typeof getMediaServerConn>) => {
    if (typeof room === 'undefined' || !speakers.length) {
      return;
    }
    if (room.videoSubscribersMap.size < 3) {
      // no need to update
      return;
    }

    for (let i = 0; i < speakers.length; i++) {
      const speaker = speakers[i];
      const participant = room.room.getParticipantByIdentity(speaker.userId);
      // if this user has video then we can update to reorder
      if (participant && participant.videoTrackPublications.size) {
        room.addVideoSubscriber(participant);
      }
    }
  },
  ACTIVE_SPEAKER_VIDEO_REARRANGE_DURATION,
  { edges: ['leading'] },
);

const ActiveSpeakers = () => {
  const activeSpeakers = useAppSelector(selectSpeakingParticipants);
  const participantIds = useAppSelector(participantsSelector.selectIds);
  const room = getMediaServerConn();

  const speakingParticipantIds = useMemo(
    () =>
      activeSpeakers
        .map((p) => p.userId)
        .sort()
        .join(','),
    [activeSpeakers],
  );

  useEffect(() => {
    if (speakingParticipantIds) {
      reOrderWebcams(activeSpeakers, room);
    }

    // cancel any pending throttled calls when the component unmounts.
    return () => {
      reOrderWebcams.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speakingParticipantIds, room]);

  const activeSpeakersElms = useMemo(() => {
    // Create a Set for efficient O(1) lookups.
    const participantIdSet = new Set(participantIds);

    // Filter the speakers first, which is more performant.
    const validSpeakers = activeSpeakers.filter((speaker) =>
      participantIdSet.has(speaker.userId),
    );

    if (!validSpeakers.length) {
      return null;
    }

    return validSpeakers.map((speaker) => (
      <SpeakerComponent key={speaker.userId} speaker={speaker} />
    ));
  }, [activeSpeakers, participantIds]);

  return (
    activeSpeakersElms && (
      <div className="active-speakers-wrap flex w-full items-center justify-center absolute top-0 left-0 z-9999">
        {activeSpeakersElms}
      </div>
    )
  );
};

export default ActiveSpeakers;
