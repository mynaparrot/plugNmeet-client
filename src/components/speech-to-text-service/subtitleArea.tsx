import React, { useEffect, useMemo, useState } from 'react';

import { RootState, useAppSelector } from '../../store';
import { TextWithInfo } from '../../store/slices/interfaces/speechServices';

const speechServicesSelector = (state: RootState) => state.speechServices;

interface FinalTexts {
  first?: TextWithInfo;
  second?: TextWithInfo;
}

const SubtitleArea = () => {
  const speechServices = useAppSelector(speechServicesSelector);

  const [finalTexts, setFinalTexts] = useState<FinalTexts>({
    first: undefined,
    second: undefined,
  });
  const [subtitleText, setSubtitleText] = useState<string | undefined>(
    undefined,
  );

  useMemo(() => {
    if (speechServices.finalText) {
      setFinalTexts((prevState) => ({
        ...prevState,
        first: prevState.first,
        second: speechServices.finalText,
      }));
    }
  }, [speechServices.finalText]);

  useEffect(() => {
    const text: string[] = [];
    if (finalTexts.first && finalTexts.first.from !== finalTexts.second?.from) {
      text.push(
        `${finalTexts.first.from}:`,
        finalTexts.first.text.slice(-20),
        '\n',
      );
    }

    const from = finalTexts.second?.from ?? '';

    if (finalTexts.second) {
      text.push(
        `${finalTexts.second.from}:`,
        finalTexts.second.text.slice(-20),
      );
    }

    if (speechServices.interimText) {
      if (from === speechServices.interimText.from) {
        text.push(speechServices.interimText.text);
      } else {
        text.push(
          `\n${speechServices.interimText.from}: ${speechServices.interimText.text}`,
        );
      }
    }

    setSubtitleText(text.join(' '));

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
          <p className="py-1 px-2 bg-black text-white m-auto inline-block break-words text-center whitespace-pre-wrap">
            {subtitleText}
          </p>
        </div>
      ) : null}
    </>
  );
};

export default SubtitleArea;
