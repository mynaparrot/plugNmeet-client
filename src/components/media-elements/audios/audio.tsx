import React, { useEffect, useRef } from 'react';
import { RemoteAudioTrack } from 'livekit-client';

import { useAppSelector } from '../../../store';
import { participantsSelector } from '../../../store/slices/participantSlice';

interface IAudioElmProps {
  audioTrack: RemoteAudioTrack;
  userId: string;
}

const AudioElm = ({ audioTrack, userId }: IAudioElmProps) => {
  const ref = useRef<HTMLAudioElement>(null);
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
    if (typeof participant.audioVolume !== 'undefined') {
      audioTrack.setVolume(participant.audioVolume);
    }
  }, [audioTrack, participant?.audioVolume]);

  return (
    <div style={{ display: 'none' }}>
      <audio autoPlay ref={ref} />
    </div>
  );
};

export default React.memo(AudioElm);
