import React, { Suspense, useMemo } from 'react';

import { useAppSelector } from '../../../store';

const TranslationTranscription = React.lazy(() => import('../../translation-transcription'));

export const useTranslationTranscription = () => {
  const isEnabled = useAppSelector(
    (state) =>
      !!state.session.currentRoom.metadata?.roomFeatures?.insightsFeatures?.transcriptionFeatures
        ?.isEnabled,
  );

  return useMemo(() => {
    if (isEnabled) {
      return (
        <Suspense fallback={null}>
          <TranslationTranscription />
        </Suspense>
      );
    }
    return null;
  }, [isEnabled]);
};
