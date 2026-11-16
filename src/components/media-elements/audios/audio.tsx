import React, { useEffect, useMemo, useRef } from 'react';
import { RemoteAudioTrack } from 'livekit-client';
import { throttle } from 'es-toolkit';

import { useAppSelector } from '../../../store';
import { participantsSelector } from '../../../store/slices/participantSlice';
import { aiAgentSelector, isAIAgentLocalMutedSelector } from '../../../store/slices/aiAgentSlice';
import { isAIAgentUserId } from '../../insights-ai/ai-agent/constants';

interface IAudioElmProps {
  audioTrack: RemoteAudioTrack;
  userId: string;
  isLocalUser: boolean;
}

const AudioElm = ({ audioTrack, userId, isLocalUser }: IAudioElmProps) => {
  const ref = useRef<HTMLAudioElement>(null);
  const isNatsServerConnected = useAppSelector((state) => state.roomSettings.isNatsServerConnected);
  const audioVolume = useAppSelector(
    (state) => participantsSelector.selectById(state, userId)?.audioVolume,
  );
  // the AI agent is muted only for the participant who asked for it
  const agentUserId = useAppSelector((state) => aiAgentSelector(state)?.agentUserId);
  const isAIAgentMutedLocally = useAppSelector(
    (state) => isAIAgentLocalMutedSelector(state) && isAIAgentUserId(userId, agentUserId),
  );
  const isSilenced = isLocalUser || isAIAgentMutedLocally;

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
    if (!el) {
      return;
    }
    // the loudness is applied by the effect below, so a mute change never
    // re-attaches the track
    audioTrack.attach(el);

    return () => {
      audioTrack.detach(el);
    };
  }, [audioTrack]);

  useEffect(() => {
    if (isSilenced) {
      audioTrack.setVolume(0);
    } else if (typeof audioVolume !== 'undefined') {
      throttledSetVolume(audioVolume);
    }
  }, [audioVolume, throttledSetVolume, isSilenced, audioTrack]);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    if (!isNatsServerConnected && !isLocalUser) {
      el.pause();
    } else if ((isNatsServerConnected || isLocalUser) && el.paused) {
      void el.play();
    }
  }, [isNatsServerConnected, isLocalUser]);

  return (
    <div style={{ display: 'none' }}>
      <audio autoPlay ref={ref} />
    </div>
  );
};

export default React.memo(AudioElm);
