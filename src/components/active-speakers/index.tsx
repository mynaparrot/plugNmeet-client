import React, { useEffect, useMemo } from 'react';
import { throttle } from 'es-toolkit';

import { useAppSelector } from '../../store';
import { getMediaServerConn } from '../../helpers/livekit/utils';
import { APP_LAYOUT_CLASSES } from '../../helpers/dimensions';
import { IActiveSpeaker } from '../../store/slices/interfaces/activeSpeakers';
import useActiveSpeakers from './useActiveSpeakers';

const ACTIVE_SPEAKER_VIDEO_REARRANGE_DURATION = 8000;

const reOrderWebcams = throttle(
  (speakers: IActiveSpeaker[], room: ReturnType<typeof getMediaServerConn>) => {
    if (typeof room === 'undefined' || !speakers.length) {
      return;
    }

    for (let i = 0; i < speakers.length; i++) {
      const speaker = speakers[i];
      const participant = room.getVideoSubscriberParticipant(speaker.userId);
      // if this user has video then we can update to reorder
      if (participant && participant.videoTrackPublications.size) {
        room.addVideoSubscriber(participant);
      }
    }
  },
  ACTIVE_SPEAKER_VIDEO_REARRANGE_DURATION,
  { edges: ['leading'] },
);

const ActiveSpeakers = ({ activeSidePanel }) => {
  const activeSpeakers = useActiveSpeakers();
  const focusActiveSpeakerWebcam = useAppSelector(
    (state) => state.roomSettings.focusActiveSpeakerWebcam,
  );
  const hasWebcamPages = useAppSelector((state) => state.roomSettings.hasWebcamPages);
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
    if (hasWebcamPages && focusActiveSpeakerWebcam && speakingParticipantIds) {
      reOrderWebcams(activeSpeakers, room);
    }

    // cancel any pending throttled calls when the component unmounts.
    return () => {
      reOrderWebcams.cancel();
    };
    // oxlint-disable-next-line exhaustive-deps, react/exhaustive-effect-dependencies
  }, [speakingParticipantIds, room, focusActiveSpeakerWebcam, hasWebcamPages]);

  return (
    activeSpeakers.length > 0 && (
      <div
        className={`active-speakers-wrap flex items-center justify-center absolute top-0 start-0 pointer-events-none ${activeSidePanel ? APP_LAYOUT_CLASSES.activeSpeakersOpen : 'w-full'}`}
      >
        {activeSpeakers.map((speaker) => (
          <div
            key={speaker.userId}
            className="speaker m-1 px-3 py-1 primaryColor text-[12px] rounded-2xl inline-flex items-center bg-white border border-solid border-white dark:border-Gray-800 dark:bg-Gray-800 dark:text-white"
          >
            <i className="pnm-mic-unmute text-[10px] secondaryColor me-2" />
            {speaker.name}
          </div>
        ))}
      </div>
    )
  );
};

export default ActiveSpeakers;
