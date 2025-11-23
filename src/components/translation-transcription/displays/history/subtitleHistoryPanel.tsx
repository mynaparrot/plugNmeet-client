import React, {
  Dispatch,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { PopoverPanel } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import { store, useAppSelector } from '../../../../store';
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
  const scrollableContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollDownBtn, setShowScrollDownBtn] = useState(false);

  const lastFinalTexts = useAppSelector(
    (state) => state.speechServices.lastFinalTexts,
  );
  const selectedSubtitleLang = useAppSelector(
    (state) => state.speechServices.selectedSubtitleLang,
  );

  const downloadTexts = useCallback(() => {
    if (!lastFinalTexts.length) {
      return;
    }

    const roomTitle = store.getState().session.currentRoom.metadata?.roomTitle;
    const now = new Date();
    const formattedDate = now.toLocaleDateString();
    const formattedTime = now.toLocaleTimeString();
    const fileTimestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');

    const header = `${t('speech-services.download-header', {
      name: roomTitle,
      lang: selectedSubtitleLang,
      date: formattedDate,
      time: formattedTime,
    })}\n\n--------------------------------------------------\n\n`;

    const body = lastFinalTexts
      .map((t) => `[${t.time}] ${t.from}:\n${t.text}`)
      .join('\n\n');

    const fileContent = header + body;

    const formBlob = new Blob([fileContent], {
      type: 'text/plain;charset=UTF-8',
    });

    const link = document.createElement('a');
    link.setAttribute('href', window.URL.createObjectURL(formBlob));
    link.setAttribute(
      'download',
      `subtitles-${selectedSubtitleLang}-${fileTimestamp}.txt`,
    );
    document.body.appendChild(link);

    link.click();
    link.remove();
  }, [lastFinalTexts, selectedSubtitleLang, t]);

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

  const handleScroll = useCallback(() => {
    const container = scrollableContainerRef.current;
    if (container) {
      // We'll consider the user has scrolled up if they are more than 200px
      // from the bottom. This threshold prevents the button from flickering.
      const isScrolledUp =
        container.scrollHeight - container.clientHeight >
        container.scrollTop + 200;
      // Avoid unnecessary re-renders if the state is already correct.
      if (isScrolledUp !== showScrollDownBtn) {
        setShowScrollDownBtn(isScrolledUp);
      }
    }
  }, [showScrollDownBtn]);

  return (
    <PopoverPanel
      className="SpeechHistory absolute left-5 z-10 bottom-28 w-full max-w-[330px] bg-Gray-950/85 h-ful rounded-lg"
      static={showPopover}
    >
      <h2 className="relative text-sm font-medium leading-6 text-white px-4 flex items-center h-10 justify-between border-b border-white/15">
        <div className="left">
          {t('speech-services.subtitle-history-modal-title')}
        </div>
        <div className="right flex items-center justify-center gap-3">
          {showScrollDownBtn && (
            <button
              className="w-5 h-5 flex items-center justify-center cursor-pointer"
              onClick={() => forceScrollToBottom()}
            >
              <ScrollToBottomIconSVG />
            </button>
          )}
          <button
            className="w-5 h-5 flex items-center justify-center cursor-pointer"
            onClick={() => downloadTexts()}
          >
            <DownloadIconSVG />
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
        onScroll={handleScroll}
        className="px-4 py-6 h-[300px] overflow-hidden overflow-y-auto scrollBar scrollBar4 scrollBarDark grid gap-3"
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
