import React from 'react';

import { useAppSelector } from '../../../store';
import { useLiveCaptions } from './useLiveCaptions';

const LINE_HEIGHT = 1.4;

const LiveSubtitle = () => {
  const subtitleFontSize = useAppSelector(
    (state) => state.speechServices.subtitleFontSize,
  );

  const { finalBuffer, interimText, selectedSubtitleLang, speaker } =
    useLiveCaptions();

  const hasText = Boolean(finalBuffer || interimText);

  if (!selectedSubtitleLang || !hasText) {
    return null;
  }

  return (
    <div className="sub-title-wrapper relative h-0 w-full">
      <div
        className="
          sub-title pointer-events-none absolute bottom-4 start-1/2
          flex w-11/12 items-center
          px-4
          ltr:-translate-x-1/2
          rtl:translate-x-1/2
          sm:px-10
        "
        style={{ fontSize: subtitleFontSize }}
      >
        <div
          className="
            mx-auto flex w-fit max-w-[60vw] items-stretch
            overflow-hidden rounded-lg
            border border-white/15
            bg-Gray-950/70 text-white
            shadow-virtual-item
          "
          role="status"
          aria-live="polite"
          aria-atomic="false"
        >
          {speaker && (
            <div
              className="
                flex w-fit shrink-0 items-center
                border-e border-white/15
                bg-black/25 px-3 font-bold
              "
            >
              <span className="truncate">{speaker}</span>
            </div>
          )}

          <div
            className="
              relative flex min-w-0 flex-1 flex-col justify-end
              overflow-hidden px-3 text-start
            "
            style={{
              minHeight: `${LINE_HEIGHT}em`,
              maxHeight: `${LINE_HEIGHT * 2}em`,
            }}
          >
            <div
              className="w-full whitespace-normal break-words"
              style={{
                lineHeight: LINE_HEIGHT,
              }}
            >
              <span>{finalBuffer}</span>

              {finalBuffer && interimText && ' '}

              <span className="opacity-70">{interimText}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveSubtitle;
