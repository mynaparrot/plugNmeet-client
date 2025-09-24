import React, { useEffect, useMemo, useState } from 'react';

import { useAppSelector } from '../../store';
import { TextWithInfo } from '../../store/slices/interfaces/speechServices';

interface FinalTexts {
  first?: TextWithInfo;
  second?: TextWithInfo;
}

const SubtitleArea = () => {
  const speechServices = useAppSelector((state) => state.speechServices);

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
    if (!finalTexts.first && !finalTexts.second) {
      return;
    }
    let lastLineFrom = '';

    let text: string[] = [];
    if (
      finalTexts.first &&
      finalTexts.first?.from === finalTexts.second?.from
    ) {
      // both are the same person
      const t = finalTexts.first.text + ' ' + finalTexts.second?.text;
      text.push(`${finalTexts.first.from}:`, t.slice(-50));
      lastLineFrom = finalTexts.first.from;
    } else {
      // they are both different person
      if (finalTexts.first) {
        text.push(
          `${finalTexts.first.from}:`,
          finalTexts.first.text.slice(-20),
        );
        if (finalTexts.second) {
          // if second data exist, then we'll require adding a new line
          text.push('\n');
        }
        lastLineFrom = finalTexts.first.from;
      }

      if (finalTexts.second) {
        text.push(
          `${finalTexts.second.from}:`,
          finalTexts.second.text.slice(-50),
        );
        lastLineFrom = finalTexts.second.from;
      }
    }

    if (speechServices.interimText) {
      if (speechServices.interimText.text.length > 100) {
        // if we have a lot of text then better to show only those
        text = [
          `${speechServices.interimText.from}:`,
          speechServices.interimText.text.slice(-200),
        ];
      } else {
        if (lastLineFrom === speechServices.interimText.from) {
          text.push(speechServices.interimText.text);
        } else {
          text.push(
            '\n',
            `${speechServices.interimText.from}:`,
            speechServices.interimText.text,
          );
        }
      }
    }

    if (!text.length) {
      return;
    }

    setSubtitleText(text.join(' '));
    const clear = setTimeout(() => {
      setSubtitleText(undefined);
    }, 10000);

    return () => {
      if (clear) {
        clearTimeout(clear);
      }
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
          <div className="inline-flex items-center gap-3 py-1.5 px-2 bg-Gray-950/70 text-white m-auto break-words text-center whitespace-pre-wrap border border-white/15 rounded-lg overflow-hidden shadow-virtual-item">
            <div className="flex items-center h-7 rounded-lg overflow-hidden border border-white/15">
              <div className="icon px-1.5">
                <svg
                  width="15"
                  height="14"
                  viewBox="0 0 15 14"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M1.5 5.66667L1.5 8.33333M4.5 3L4.5 11M7.5 1V13M10.5 3V11M13.5 5.66667V8.33333"
                    stroke="white"
                    strokeWidth="1.33"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="text-xs font-semibold text-white bg-white/10 h-full flex items-center px-1.5">
                {speechServices.selectedSubtitleLang.toUpperCase()}
              </div>
            </div>
            {subtitleText}
          </div>
        </div>
      ) : null}
    </>
  );
};

export default SubtitleArea;
