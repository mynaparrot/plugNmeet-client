import React, { useEffect, useMemo, useRef } from 'react';
import { RemoteAudioTrack } from 'livekit-client';
import { throttle } from 'es-toolkit';

import { useAppSelector } from '../../../store';

interface IAudioElmProps {
  audioTrack: RemoteAudioTrack;
}

const AudioElm = ({ audioTrack }: IAudioElmProps) => {
  const roomScreenShareAudioVolume = useAppSelector(
    (state) => state.roomSettings.roomScreenShareAudioVolume,
  );
  const isNatsServerConnected = useAppSelector(
    (state) => state.roomSettings.isNatsServerConnected,
  );
  const ref = useRef<HTMLAudioElement>(null);

  const throttledSetVolume = useMemo(
    () =>
      throttle((volume: number) => {
        if (audioTrack) {
          audioTrack.setVolume(volume);
        }
      }, 200), // Throttle to run at most every 200ms
    [audioTrack],
  );

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
    throttledSetVolume(roomScreenShareAudioVolume);
  }, [roomScreenShareAudioVolume, throttledSetVolume]);

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

export default AudioElm;
