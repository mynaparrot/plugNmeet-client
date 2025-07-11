import React, { useEffect, useRef } from 'react';
import { RemoteAudioTrack } from 'livekit-client';

import { useAppDispatch, useAppSelector } from '../../../store';
import { participantsSelector } from '../../../store/slices/participantSlice';
import { useAudioActivity } from '../../../helpers/hooks/useAudioActivity';
import { addOrUpdateSpeaker } from '../../../store/slices/activeSpeakersSlice';

interface IAudioElmProps {
  audioTrack: RemoteAudioTrack;
  userId: string;
  name: string;
}

const AudioElm = ({ audioTrack, userId, name }: IAudioElmProps) => {
  const audioActivity = useAudioActivity(audioTrack);
  const dispatch = useAppDispatch();

  const ref = useRef<HTMLAudioElement>(null);
  const isNatsServerConnected = useAppSelector(
    (state) => state.roomSettings.isNatsServerConnected,
  );
  const audioVolume = useAppSelector(
    (state) => participantsSelector.selectById(state, userId)?.audioVolume,
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
    if (audioActivity) {
      dispatch(
        addOrUpdateSpeaker({
          userId: userId,
          name: name,
          isSpeaking: audioActivity.isSpeaking,
          audioLevel: audioActivity.audioLevel,
          lastSpokeAt: audioActivity.lastSpokeAt,
        }),
      );
    }
    //eslint-disable-next-line
  }, [audioActivity]);

  useEffect(() => {
    if (audioTrack && typeof audioVolume !== 'undefined') {
      audioTrack.setVolume(audioVolume);
    }
  }, [audioTrack, audioVolume]);

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
