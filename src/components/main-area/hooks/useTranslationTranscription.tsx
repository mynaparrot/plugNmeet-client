import { useMemo } from 'react';

import { useAppSelector } from '../../../store';
import TranslationTranscription from '../../translation-transcription';

export const useTranslationTranscription = () => {
  const isEnabled = useAppSelector(
    (state) =>
      !!state.session.currentRoom.metadata?.roomFeatures?.insightsFeatures
        ?.transcriptionFeatures?.isEnabled,
  );

  return useMemo(() => {
    if (isEnabled) {
      return <TranslationTranscription />;
    }
    return null;
  }, [isEnabled]);
};
