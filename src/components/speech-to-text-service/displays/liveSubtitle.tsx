import React, { useEffect, useState } from 'react';

import { TextWithInfo } from '../../../store/slices/interfaces/speechServices';
import { useAppSelector } from '../../../store';

interface FinalTexts {
  first?: TextWithInfo;
  second?: TextWithInfo;
}

const LiveSubtitle = () => {
  const speechServices = useAppSelector((state) => state.speechServices);

  const [finalTexts, setFinalTexts] = useState<FinalTexts>({
    first: undefined,
    second: undefined,
  });
  const [subtitleText, setSubtitleText] = useState<string | undefined>(
    undefined,
  );

  // This effect manages a "rolling" display of the last two final text segments.
  useEffect(() => {
    if (speechServices.finalText) {
      setFinalTexts((prevState) => ({
        first: prevState.second,
        second: speechServices.finalText,
      }));
    }
    // setFinalTexts is stable, but it's good practice to include it.
  }, [speechServices.finalText, setFinalTexts]);

  // This effect combines the final and interim texts into a single string for display
  // and sets a timer to clear the subtitle after a delay.
  useEffect(() => {
    const hasFinalText = finalTexts.first || finalTexts.second;
    const hasInterimText = speechServices.interimText;

    if (!hasFinalText && !hasInterimText) {
      return;
    }

    let lastLineFrom = '';
    const text: string[] = [];

    // Combine the last two final texts.
    if (finalTexts.first && finalTexts.first.from === finalTexts.second?.from) {
      // If from the same speaker, combine them on one line.
      const t = `${finalTexts.first.text} ${finalTexts.second?.text}`;
      text.push(`${finalTexts.first.from}:`, t.slice(-50));
      lastLineFrom = finalTexts.first.from;
    } else {
      // If from different speakers, show them on separate lines.
      if (finalTexts.first) {
        text.push(
          `${finalTexts.first.from}:`,
          finalTexts.first.text.slice(-20),
        );
        lastLineFrom = finalTexts.first.from;
      }

      if (finalTexts.second) {
        if (finalTexts.first) text.push('\n'); // Add a newline if there was a first text.
        text.push(
          `${finalTexts.second.from}:`,
          finalTexts.second.text.slice(-50),
        );
        lastLineFrom = finalTexts.second.from;
      }
    }

    // Add the interim (real-time) text.
    if (speechServices.interimText) {
      if (speechServices.interimText.text.length > 100) {
        // If interim text is very long, show only that to prevent overflow.
        text.length = 0;
        text.push(
          `${speechServices.interimText.from}:`,
          speechServices.interimText.text.slice(-200),
        );
      } else {
        if (lastLineFrom === speechServices.interimText.from) {
          // Same speaker, append to the current line.
          text.push(speechServices.interimText.text);
        } else {
          // Different speaker, start a new line.
          if (lastLineFrom !== '') text.push('\n');
          text.push(
            `${speechServices.interimText.from}:`,
            speechServices.interimText.text,
          );
        }
      }
    }

    if (!text.length) {
      return;
    }

    // Set the text and schedule it to be cleared.
    setSubtitleText(text.join(' '));
    const clear = setTimeout(() => {
      setSubtitleText(undefined);
    }, 10000);

    return () => clearTimeout(clear);
  }, [finalTexts, speechServices.interimText]);

  return (
    speechServices.selectedSubtitleLang !== '' &&
    subtitleText !== undefined && (
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
    )
  );
};

export default LiveSubtitle;
