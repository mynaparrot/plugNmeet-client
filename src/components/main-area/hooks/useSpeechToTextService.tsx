import { useMemo } from 'react';

import { useAppSelector } from '../../../store';
import SpeechToTextService from '../../speech-to-text-service';

export const useSpeechToTextService = () => {
  const activateSpeechService = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures
        ?.speechToTextTranslationFeatures?.isEnabled,
  );

  return useMemo(() => {
    if (activateSpeechService) {
      return <SpeechToTextService />;
    }
    return null;
  }, [activateSpeechService]);
};
