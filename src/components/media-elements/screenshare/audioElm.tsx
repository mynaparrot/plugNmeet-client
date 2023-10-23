import React, { useEffect, useRef } from 'react';
import { RemoteTrackPublication } from 'livekit-client';
import { createSelector } from '@reduxjs/toolkit';
import { RootState, useAppSelector } from '../../../store';

interface IAudioElmProps {
  track: RemoteTrackPublication;
}
const roomScreenShareAudioVolumeSelector = createSelector(
  (state: RootState) => state.roomSettings.roomScreenShareAudioVolume,
  (roomScreenShareAudioVolume) => roomScreenShareAudioVolume,
);

const AudioElm = ({ track }: IAudioElmProps) => {
  const roomScreenShareAudioVolume = useAppSelector(
    roomScreenShareAudioVolumeSelector,
  );
  const ref = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) {
      track.audioTrack?.attach(el);
      el.volume = roomScreenShareAudioVolume;
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
      el.volume = roomScreenShareAudioVolume;
    }
  }, [roomScreenShareAudioVolume]);

  return (
    <div style={{ display: 'none' }}>
      <audio autoPlay ref={ref} />
    </div>
  );
};

export default AudioElm;
