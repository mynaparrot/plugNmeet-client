import React, { useEffect, useRef } from 'react';
import { RemoteAudioTrack } from 'livekit-client';

import { RootState, useAppSelector } from '../../../store';
import { participantsSelector } from '../../../store/slices/participantSlice';
import { createSelector } from '@reduxjs/toolkit';

interface IAudioElmProps {
  audioTrack: RemoteAudioTrack;
  userId: string;
}

const isNatsServerConnectedSelector = createSelector(
  (state: RootState) => state.roomSettings,
  (roomSettings) => roomSettings.isNatsServerConnected,
);

const AudioElm = ({ audioTrack, userId }: IAudioElmProps) => {
  const ref = useRef<HTMLAudioElement>(null);
  const isNatsServerConnected = useAppSelector(isNatsServerConnectedSelector);
  const participant = useAppSelector((state) =>
    participantsSelector.selectById(state, userId),
  );

  useEffect(() => {
    const el = ref.current;
    if (el) {
      audioTrack.attach(el);
      if (typeof participant.audioVolume !== 'undefined') {
        audioTrack.setVolume(participant.audioVolume);
      }
    }

    return () => {
      if (el) {
        audioTrack.detach(el);
      }
    };
    //eslint-disable-next-line
  }, [audioTrack]);

  useEffect(() => {
    if (
      participant &&
      audioTrack &&
      typeof participant.audioVolume !== 'undefined'
    ) {
      audioTrack.setVolume(participant.audioVolume);
    }
  }, [audioTrack, participant]);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    if (!isNatsServerConnected) {
      el.pause();
    } else if (isNatsServerConnected && el.paused) {
      el.play().then();
    }
  }, [isNatsServerConnected]);

  return (
    <div style={{ display: 'none' }}>
      <audio autoPlay ref={ref} />
    </div>
  );
};

export default React.memo(AudioElm);
