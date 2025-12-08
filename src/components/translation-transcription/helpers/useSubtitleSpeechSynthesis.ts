import { useEffect } from 'react';

import { useAppSelector } from '../../../store';
import speechQueue from './SpeechSynthesisQueue'; // Import the singleton

export const useSubtitleSpeechSynthesis = () => {
  const finalText = useAppSelector((state) => state.speechServices.finalText);
  const selectedSubtitleLang = useAppSelector(
    (state) => state.speechServices.selectedSubtitleLang,
  );

  // Effect to add new final texts to the queue
  useEffect(() => {
    if (finalText?.text && selectedSubtitleLang) {
      speechQueue.speak(finalText.text, selectedSubtitleLang);
    }
  }, [finalText, selectedSubtitleLang]);

  return {
    start: () => speechQueue.start(),
    stop: () => speechQueue.stop(),
  };
};
