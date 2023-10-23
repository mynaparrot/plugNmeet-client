import React, { useEffect, useRef } from 'react';
import { RemoteTrackPublication } from 'livekit-client';
import { createSelector } from '@reduxjs/toolkit';
import { RootState, useAppSelector } from '../../../store';

interface IAudioElmProps {
  track: RemoteTrackPublication;
}
const roomAudioVolumeSelector = createSelector(
  (state: RootState) => state.roomSettings.roomAudioVolume,
  (roomAudioVolume) => roomAudioVolume,
);

const AudioElm = ({ track }: IAudioElmProps) => {
  const roomAudioVolume = useAppSelector(roomAudioVolumeSelector);
  const ref = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) {
      track.audioTrack?.attach(el);
      el.volume = roomAudioVolume;
    }

    return () => {
      if (el) {
        track.audioTrack?.detach(el);
      }
    };
    //eslint-disable-next-line
  }, [track]);

  useEffect(() => {
    const el = ref.current;
    if (el) {
      el.volume = roomAudioVolume;
    }
  }, [roomAudioVolume]);

  return (
    <div style={{ display: 'none' }}>
      <audio autoPlay ref={ref} />
    </div>
  );
};

export default AudioElm;
