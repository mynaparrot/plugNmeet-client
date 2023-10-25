import React, { useEffect, useMemo, useState } from 'react';
import { createSelector } from '@reduxjs/toolkit';

import { RootState, useAppSelector } from '../../store';

const speechServicesSelector = createSelector(
  (state: RootState) => state.speechServices,
  (speechServices) => speechServices,
);

const SubtitleArea = () => {
  const speechServices = useAppSelector(speechServicesSelector);

  const [finalTexts, setFinalTexts] = useState<object>({ 0: '', 1: '' });
  const [subtitleText, setSubtitleText] = useState<string | undefined>(
    undefined,
  );

  useMemo(() => {
    if (speechServices.finalText) {
      setFinalTexts((prevState) => ({
        ...prevState,
        [0]: prevState[1],
        [1]: speechServices.finalText,
      }));
    }
  }, [speechServices.finalText]);

  useEffect(() => {
    const text: string[] = [finalTexts[0], finalTexts[1]];

    if (speechServices.interimText) {
      text.push(speechServices.interimText.text);
    }
    const finalText = text.join(' ').split(' ').slice(-20);
    setSubtitleText(finalText.join(' '));

    const clear = setTimeout(() => {
      setSubtitleText(undefined);
    }, 10000);

    return () => {
      clearTimeout(clear);
    };
  }, [finalTexts, speechServices.interimText]);

  return (
    <>
      {speechServices.selectedSubtitleLang !== '' &&
      subtitleText !== undefined ? (
        <div
          className="sub-title w-11/12 absolute bottom-4  left-1/2 -translate-x-1/2 pointer-events-none px-10 flex items-center"
          style={{ fontSize: speechServices.subtitleFontSize }}
        >
          <p className="py-1 px-2 bg-black text-white m-auto inline-block break-words text-center">
            {subtitleText}
          </p>
        </div>
      ) : null}
    </>
  );
};

export default SubtitleArea;
