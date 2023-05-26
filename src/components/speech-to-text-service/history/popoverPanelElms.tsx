import React, { Dispatch, useEffect, useRef } from 'react';
import { Popover } from '@headlessui/react';
import Draggable from 'react-draggable';
import { useTranslation } from 'react-i18next';
import { createSelector } from '@reduxjs/toolkit';

import { RootState, useAppSelector } from '../../../store';

interface PopoverPanelElmsProps {
  showPopover: boolean;
  setShowPopover: Dispatch<boolean>;
}

const lastFinalTextsSelector = createSelector(
  (state: RootState) => state.speechServices.lastFinalTexts,
  (lastFinalTexts) => lastFinalTexts,
);
const interimTextSelector = createSelector(
  (state: RootState) => state.speechServices.interimText,
  (interimText) => interimText,
);

const PopoverPanelElms = ({
  showPopover,
  setShowPopover,
}: PopoverPanelElmsProps) => {
  const { t } = useTranslation();
  const lastFinalTexts = useAppSelector(lastFinalTextsSelector);
  const interimText = useAppSelector(interimTextSelector);
  const scrollToRef = useRef<HTMLDivElement>(null);
  const nodeRef = useRef(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (scrollToRef.current) {
        scrollToRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
          inline: 'nearest',
        });
      }
    }, 500);
    return () => {
      clearTimeout(timeout);
    };
  }, [lastFinalTexts.length, interimText]);

  return (
    <Draggable nodeRef={nodeRef}>
      <Popover.Panel
        className="SpeechHistory absolute z-10 mx-1 bottom-14 w-full max-w-md bg-white dark:bg-darkPrimary shadow-xl rounded-2xl h-ful"
        ref={nodeRef}
        static={showPopover}
      >
        <h2 className="relative text-lg font-medium leading-6 text-gray-900 dark:text-white p-5 pb-3 px-3 cursor-move">
          {t('speech-services.subtitle-history-modal-title')}
          <button
            className="absolute top-7 right-3 w-[25px] h-[25px] outline-none"
            onClick={() => setShowPopover(!showPopover)}
          >
            <span className="inline-block h-[1px] w-[20px] bg-primaryColor dark:bg-darkText absolute top-0 left-0 rotate-45" />
            <span className="inline-block h-[1px] w-[20px] bg-primaryColor dark:bg-darkText absolute top-0 left-0 -rotate-45" />
          </button>
        </h2>
        <hr />
        <div className="p-3 pb-8 text-primary dark:text-white h-[200px] overflow-hidden overflow-y-auto scrollBar scrollBar4">
          {lastFinalTexts.slice(-50).map((t, i) => {
            return (
              <div key={i} className="sentence w-full pt-2">
                <p className="date text-sm pb-1 primaryColor dark:text-darkText">
                  <span className="text-xs">{t.time}</span> {t.from}:
                </p>
                <p className="message-content max-w-fit shadow-footer text-sm bg-secondaryColor text-white py-1 px-2 rounded">
                  {t.text}
                </p>
              </div>
            );
          })}
          {interimText ? (
            <div className="sentence w-full pt-2">
              <p className="date text-sm pb-1 primaryColor dark:text-darkText">
                <span className="text-xs">{interimText.time}</span>{' '}
                {interimText.from}:
              </p>
              <p className="message-content max-w-fit shadow-footer text-sm bg-secondaryColor text-white py-1 px-2 rounded">
                {interimText.text}
              </p>
            </div>
          ) : null}
          <div ref={scrollToRef} />
        </div>
      </Popover.Panel>
    </Draggable>
  );
};

export default PopoverPanelElms;
