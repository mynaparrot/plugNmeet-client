import React, { useMemo } from 'react';

import { store, useAppSelector } from '../../../store';
import { activeSpeakersSelector } from '../../../store/slices/activeSpeakersSlice';
import SpeakerComponent from './speaker';

const ActiveSpeakers = () => {
  const activeSpeakers = useAppSelector(activeSpeakersSelector.selectAll);

  const activeSpeakersElms = useMemo(() => {
    if (!activeSpeakers.length) {
      return null;
    }
    const participantIds = store.getState().participants.ids;
    return activeSpeakers.map((speaker) => {
      if (participantIds.find((p) => p === String(speaker.userId))) {
        return <SpeakerComponent key={speaker.sid} speaker={speaker} />;
      }
    });
  }, [activeSpeakers]);

  return activeSpeakersElms ? (
    <div className="active-speakers-wrap flex w-full items-center justify-center absolute top-0 left-0 z-[9999]">
      {activeSpeakersElms}
    </div>
  ) : null;
};

export default ActiveSpeakers;
