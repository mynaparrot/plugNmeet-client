import { useAppSelector } from '../../../store';
import { useCallback, useEffect, useRef, useState } from 'react';

const MAX_BUFFER_CHARS = 400;
const CLEAR_DELAY = 10_000;

const trimBuffer = (value: string): string => {
  const normalized = value.replace(/\s+/g, ' ').trim();

  if (normalized.length <= MAX_BUFFER_CHARS) {
    return normalized;
  }

  const sliced = normalized.slice(-MAX_BUFFER_CHARS);
  const firstSpaceIndex = sliced.indexOf(' ');

  return firstSpaceIndex === -1 ? sliced : sliced.slice(firstSpaceIndex + 1);
};

export const useLiveCaptions = () => {
  const finalText = useAppSelector((state) => state.speechServices.finalText);

  const interimText = useAppSelector(
    (state) => state.speechServices.interimText,
  );

  const selectedSubtitleLang = useAppSelector(
    (state) => state.speechServices.selectedSubtitleLang,
  );

  const [finalBuffer, setFinalBuffer] = useState('');
  const [speaker, setSpeaker] = useState('');

  const speakerRef = useRef('');
  const previousLanguageRef = useRef(selectedSubtitleLang);

  const lastProcessedFinalRef = useRef<typeof finalText | null>(null);

  const resetCaptions = useCallback(() => {
    setFinalBuffer('');
    setSpeaker('');

    speakerRef.current = '';
    lastProcessedFinalRef.current = null;
  }, []);

  /*
   * Add finalized segments to the rolling buffer.
   */
  useEffect(() => {
    const text = finalText?.text.trim();

    if (!finalText || !text) {
      return;
    }

    const isSameReference = lastProcessedFinalRef.current === finalText;

    const isSameId =
      finalText.id !== undefined &&
      lastProcessedFinalRef.current?.id === finalText.id;

    if (isSameReference || isSameId) {
      return;
    }

    lastProcessedFinalRef.current = finalText;

    const speakerChanged =
      Boolean(speakerRef.current) && speakerRef.current !== finalText.from;

    speakerRef.current = finalText.from;
    setSpeaker(finalText.from);

    setFinalBuffer((previous) => {
      const nextText = speakerChanged ? text : `${previous} ${text}`;

      return trimBuffer(nextText);
    });
  }, [finalText]);

  /*
   * Handle speaker information received from interim results.
   */
  useEffect(() => {
    const interimSpeaker = interimText?.from;

    if (!interimSpeaker) {
      return;
    }

    const speakerChanged =
      Boolean(speakerRef.current) && speakerRef.current !== interimSpeaker;

    if (speakerChanged) {
      setFinalBuffer('');
      lastProcessedFinalRef.current = null;
    }

    speakerRef.current = interimSpeaker;
    setSpeaker(interimSpeaker);
  }, [interimText?.from]);

  /*
   * Clear captions after inactivity.
   */
  useEffect(() => {
    if (!finalBuffer && !interimText?.text) {
      return;
    }

    const timer = window.setTimeout(resetCaptions, CLEAR_DELAY);

    return () => window.clearTimeout(timer);
  }, [finalBuffer, interimText?.text, interimText?.from, resetCaptions]);

  /*
   * Clear captions when the selected language changes.
   */
  useEffect(() => {
    if (previousLanguageRef.current === selectedSubtitleLang) {
      return;
    }

    previousLanguageRef.current = selectedSubtitleLang;
    resetCaptions();
  }, [selectedSubtitleLang, resetCaptions]);

  return {
    finalBuffer,
    interimText: interimText?.text.trim() ?? '',
    selectedSubtitleLang,
    speaker,
  };
};
