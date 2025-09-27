import React, { useEffect, useState } from 'react';
import { isEmpty } from 'es-toolkit/compat';

import { TextWithInfo } from '../../../store/slices/interfaces/speechServices';
import { useAppSelector } from '../../../store';

const MAX_SUBTITLE_CHARS = 150;

const LiveSubtitle = () => {
  const newFinalText = useAppSelector(
    (state) => state.speechServices.finalText,
  );
  const interimText = useAppSelector(
    (state) => state.speechServices.interimText,
  );
  const selectedSubtitleLang = useAppSelector(
    (state) => state.speechServices.selectedSubtitleLang,
  );
  const subtitleFontSize = useAppSelector(
    (state) => state.speechServices.subtitleFontSize,
  );

  // Line 1: The last stable, final text.
  const [lastFinalText, setLastFinalText] = useState<
    TextWithInfo | undefined
  >();
  // This will be the source for what's rendered on line 2, with a delay for removal.
  const [displayLine2, setDisplayLine2] = useState<TextWithInfo | undefined>();
  const [isLine2FadingOut, setIsLine2FadingOut] = useState(false);

  // When a new final text arrives from the store, it becomes our stable "Line 1".
  useEffect(() => {
    if (newFinalText) {
      setLastFinalText((prevFinalText) => {
        // If there's a previous final text and it's from the same speaker...
        if (prevFinalText && prevFinalText.from === newFinalText.from) {
          // ...append the new text to the old one to create a continuous sentence.
          return {
            ...newFinalText, // Use new id, time from the latest text
            text: `${prevFinalText.text} ${newFinalText.text}`,
          };
        }
        // Otherwise, it's a new speaker, so we start a new final text.
        return newFinalText;
      });
    }
  }, [newFinalText]);

  // This effect will clear the subtitles after a period of inactivity.
  // It also manages the delayed removal of the second line.
  useEffect(() => {
    let clearAllTimer: NodeJS.Timeout;
    let clearLine2Timer: NodeJS.Timeout;

    if (interimText) {
      // If new interim text arrives, update line 2 immediately.
      setIsLine2FadingOut(false);
      setDisplayLine2(interimText);
    } else {
      // If interim text disappears, start the fade-out process.
      setIsLine2FadingOut(true);
      // Then, after the fade-out animation completes, remove the element.
      clearLine2Timer = setTimeout(() => {
        setDisplayLine2(undefined);
        setIsLine2FadingOut(false);
      }, 500); // This should match the transition duration.
    }

    // If there's no text, do nothing.
    if (!lastFinalText && !interimText) {
      return;
    }

    clearAllTimer = setTimeout(() => {
      setLastFinalText(undefined);
    }, 10000);

    return () => {
      clearTimeout(clearAllTimer);
      clearTimeout(clearLine2Timer);
    };
  }, [lastFinalText, interimText]);

  // Prepare the text for Line 1 and Line 2 based on what's available.
  let line1: { from: string; text: string; isInterim?: boolean } | undefined;
  let line2: { from: string; text: string; isInterim?: boolean } | undefined;

  if (lastFinalText && !isEmpty(lastFinalText.text)) {
    // Standard case: final text on line 1, interim on line 2.
    line1 = {
      from: lastFinalText.from,
      text: lastFinalText.text.slice(-MAX_SUBTITLE_CHARS),
    };
    if (displayLine2) {
      line2 = {
        from: displayLine2.from,
        text: displayLine2.text.slice(-MAX_SUBTITLE_CHARS),
        isInterim: true,
      };
    }
  } else if (interimText) {
    // Initial case: No final text yet, so interim text goes on line 1.
    line1 = {
      from: interimText.from,
      text: interimText.text.slice(-MAX_SUBTITLE_CHARS),
      isInterim: true,
    };
  }

  return (
    selectedSubtitleLang !== '' && // only show if user has selected a lang
    (lastFinalText || interimText) && (
      <div
        className="sub-title w-11/12 absolute bottom-4  left-1/2 -translate-x-1/2 pointer-events-none px-10 flex items-center"
        style={{ fontSize: subtitleFontSize }}
      >
        <div className="inline-block p-2 bg-Gray-950/70 text-white m-auto break-words text-center whitespace-pre-wrap border border-white/15 rounded-lg overflow-hidden shadow-virtual-item">
          {/* Line 1 */}
          <div
            className={`line-1 transition-opacity duration-300 ease-in-out ${
              line1?.isInterim ? 'opacity-70' : 'opacity-100'
            }`}
          >
            {line1 ? (
              <>
                <span className="font-bold">{line1.from}:</span>{' '}
                <span key={line1.isInterim ? 'interim' : 'final'}>
                  {line1.text}
                </span>
              </>
            ) : (
              // Use a non-breaking space to maintain height
              <>&nbsp;</>
            )}
          </div>
          {/* Line 2: Only show if there's content for it */}
          {line2 && (
            <div
              className={`line-2 transition-opacity duration-500 ease-in-out ${
                isLine2FadingOut ? 'opacity-0' : 'opacity-70'
              }`}
            >
              <span className="font-bold">{line2.from}:</span> {line2.text}
            </div>
          )}
        </div>
      </div>
    )
  );
};

export default LiveSubtitle;
