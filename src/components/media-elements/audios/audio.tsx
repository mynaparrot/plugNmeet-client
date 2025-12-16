import React, { useEffect, useMemo, useRef } from 'react';
import { RemoteAudioTrack } from 'livekit-client';
import { throttle } from 'es-toolkit';

import { useAppSelector } from '../../../store';
import { participantsSelector } from '../../../store/slices/participantSlice';

interface IAudioElmProps {
  audioTrack: RemoteAudioTrack;
  userId: string;
}

const AudioElm = ({ audioTrack, userId }: IAudioElmProps) => {
  const ref = useRef<HTMLAudioElement>(null);
  const isNatsServerConnected = useAppSelector(
    (state) => state.roomSettings.isNatsServerConnected,
  );
  const audioVolume = useAppSelector(
    (state) => participantsSelector.selectById(state, userId)?.audioVolume,
  );

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
      if (typeof audioVolume !== 'undefined') {
        audioTrack.setVolume(audioVolume);
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
    if (typeof audioVolume !== 'undefined') {
      throttledSetVolume(audioVolume);
    }
  }, [audioVolume, throttledSetVolume]);

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
