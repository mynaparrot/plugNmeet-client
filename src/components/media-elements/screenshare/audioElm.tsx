import React, { useEffect, useRef } from 'react';
import { RemoteAudioTrack } from 'livekit-client';
import { createSelector } from '@reduxjs/toolkit';
import { RootState, useAppSelector } from '../../../store';

interface IAudioElmProps {
  audioTrack: RemoteAudioTrack;
}
const roomScreenShareAudioVolumeSelector = createSelector(
  (state: RootState) => state.roomSettings.roomScreenShareAudioVolume,
  (roomScreenShareAudioVolume) => roomScreenShareAudioVolume,
);

const AudioElm = ({ audioTrack }: IAudioElmProps) => {
  const roomScreenShareAudioVolume = useAppSelector(
    roomScreenShareAudioVolumeSelector,
  );
  const ref = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) {
      audioTrack.attach(el);
      audioTrack.setVolume(roomScreenShareAudioVolume);
    }

    return () => {
      if (el) {
        audioTrack.detach(el);
      }
    };
    //eslint-disable-next-line
  }, [audioTrack]);

  useEffect(() => {
    audioTrack.setVolume(roomScreenShareAudioVolume);
  }, [audioTrack, roomScreenShareAudioVolume]);

  return (
    <div style={{ display: 'none' }}>
      <audio autoPlay ref={ref} />
    </div>
  );
};

export default AudioElm;
