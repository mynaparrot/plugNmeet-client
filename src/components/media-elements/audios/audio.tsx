import React, { useEffect, useRef } from 'react';
import { RemoteTrackPublication } from 'livekit-client';

import { useAppSelector } from '../../../store';
import { participantsSelector } from '../../../store/slices/participantSlice';

interface IAudioElmProps {
  track: RemoteTrackPublication;
  userId: string;
}

const AudioElm = ({ track, userId }: IAudioElmProps) => {
  const ref = useRef<HTMLAudioElement>(null);
  const participant = useAppSelector((state) =>
    participantsSelector.selectById(state, userId),
  );

  useEffect(() => {
    const el = ref.current;
    if (el) {
      track.audioTrack?.attach(el);
    }

    return () => {
      if (el) {
        track.audioTrack?.detach(el);
      }
    };
  }, [track]);

  useEffect(() => {
    const el = ref.current;
    if (el && typeof participant?.audioVolume !== 'undefined') {
      el.volume = participant.audioVolume;
    }
  }, [ref, participant?.audioVolume]);

  return (
    <div style={{ display: 'none' }}>
      <audio autoPlay ref={ref} />
    </div>
  );
};

export default React.memo(AudioElm);
