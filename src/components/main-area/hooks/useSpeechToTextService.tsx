import { useMemo } from 'react';

import { useAppSelector } from '../../../store';
import SpeechToTextService from '../../speech-to-text-service';

export const useSpeechToTextService = () => {
  const isEnabled = useAppSelector(
    (state) =>
      !!state.session.currentRoom.metadata?.roomFeatures?.insightsFeatures
        ?.transcriptionFeatures?.isEnabled,
  );

  return useMemo(() => {
    if (isEnabled) {
      return <SpeechToTextService />;
    }
    return null;
  }, [isEnabled]);
};
