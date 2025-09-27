import React, { Dispatch, useCallback, useEffect, useRef } from 'react';
import { PopoverPanel } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import { useAppSelector } from '../../../../store';
import { DownloadIconSVG } from '../../../../assets/Icons/DownloadIconSVG';
import { CloseIconSVG } from '../../../../assets/Icons/CloseIconSVG';
import InterimTextDisplay from './interimTextDisplay';
import { ScrollToBottomIconSVG } from '../../../../assets/Icons/ScrollToBottom';

interface SubtitleHistoryPanelProps {
  showPopover: boolean;
  setShowPopover: Dispatch<boolean>;
}

const SubtitleHistoryPanel = ({
  showPopover,
  setShowPopover,
}: SubtitleHistoryPanelProps) => {
  const { t } = useTranslation();
  const lastFinalTexts = useAppSelector(
    (state) => state.speechServices.lastFinalTexts,
  );
  const selectedSubtitleLang = useAppSelector(
    (state) => state.speechServices.selectedSubtitleLang,
  );

  const scrollableContainerRef = useRef<HTMLDivElement>(null);
  const nodeRef = useRef(null);

  const downloadTexts = useCallback(() => {
    if (!lastFinalTexts.length) {
      return;
    }

    const texts = lastFinalTexts.map((t) => {
      return `${t.time} ${t.from}:\n${t.text}`;
    });

    const formBlob = new Blob([texts.join('\n\n')], {
      type: 'text/plain;charset=UTF-8',
    });

    const link = document.createElement('a');
    link.setAttribute('href', window.URL.createObjectURL(formBlob));
    link.setAttribute('download', `subtitle_texts_${selectedSubtitleLang}.txt`);
    document.body.appendChild(link);

    link.click();
    link.remove();
  }, [lastFinalTexts, selectedSubtitleLang]);

  const forceScrollToBottom = useCallback(() => {
    const container = scrollableContainerRef.current;
    if (container) {
      // A small timeout ensures the scroll happens after the panel is fully rendered.
      setTimeout(() => {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      }, 100);
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    const container = scrollableContainerRef.current;
    if (container) {
      // Only scroll if the user is near the bottom.
      // This prevents interrupting them if they've scrolled up to read history.
      const isScrolledToBottom =
        container.scrollHeight - container.clientHeight <=
        container.scrollTop + 200; // 200px threshold is more forgiving

      if (isScrolledToBottom) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth',
        });
      }
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [lastFinalTexts.length, scrollToBottom]);

  // Always scroll to the bottom when the panel is first opened.
  useEffect(() => {
    if (showPopover) {
      forceScrollToBottom();
    }
  }, [showPopover, forceScrollToBottom]);

  return (
    <PopoverPanel
      className="SpeechHistory absolute left-5 z-10 bottom-28 w-full max-w-[330px] bg-Gray-950/85 h-ful rounded-lg"
      ref={nodeRef}
      static={showPopover}
    >
      <h2 className="relative text-sm font-medium leading-6 text-white px-4 cursor-move flex items-center h-10 justify-between border-b border-white/15">
        <div className="left">
          {t('speech-services.subtitle-history-modal-title')}
        </div>
        <div className="right flex items-center justify-center gap-3">
          <button
            className="w-5 h-5 flex items-center justify-center cursor-pointer"
            onClick={() => downloadTexts()}
          >
            <DownloadIconSVG />
          </button>
          <button
            className="w-5 h-5 flex items-center justify-center cursor-pointer"
            onClick={() => forceScrollToBottom()}
          >
            <ScrollToBottomIconSVG />
          </button>
          <button
            className="w-5 h-5 flex items-center justify-center cursor-pointer"
            onClick={() => setShowPopover(!showPopover)}
          >
            <CloseIconSVG />
          </button>
        </div>
      </h2>
      <div
        ref={scrollableContainerRef}
        className="px-4 py-6 h-[300px] overflow-hidden overflow-y-auto scrollBar scrollBar4 scrollBarDark  grid gap-3"
      >
        {lastFinalTexts.slice(-50).map((t) => {
          return (
            <div key={t.id} className="sentence w-full text-sm text-white">
              <p className="flex justify-between items-end pb-1.5 font-medium capitalize">
                <span>{t.from}</span>
                <span className="font-normal">{t.time}</span>
              </p>
              <p className="message-content w-full p-2 border border-white/10 bg-white/10 rounded-[15px] rounded-tl-none">
                {t.text}
              </p>
            </div>
          );
        })}
        <InterimTextDisplay scrollToBottom={scrollToBottom} />
      </div>
    </PopoverPanel>
  );
};

export default SubtitleHistoryPanel;
