import React, { useEffect, useRef } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { Popover } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import { RootState, useAppSelector } from '../../store';

const lastFinalTextsSelector = createSelector(
  (state: RootState) => state.speechServices.lastFinalTexts,
  (lastFinalTexts) => lastFinalTexts,
);

const SubtitleTextsHistory = () => {
  const { t } = useTranslation();
  const lastFinalTexts = useAppSelector(lastFinalTextsSelector);
  const scrollToRef = useRef<HTMLDivElement>(null);

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
  }, [lastFinalTexts.length]);

  return (
    <>
      <Popover className="subtitleTextsHistory relative">
        <Popover.Button className="absolute left-[2.7rem] lg:left-[3.1rem] bottom-1">
          <div className="microphone footer-icon relative h-[35px] lg:h-[40px] w-[35px] lg:w-[40px] rounded-full bg-[#F2F2F2] dark:bg-darkSecondary2 hover:bg-[#ECF4FF] flex items-center justify-center cursor-pointer has-tooltip">
            <span className="tooltip">
              {t('speech-services.subtitle-history-modal-title')}
            </span>
            <i className="pnm-closed-captioning primaryColor dark:text-darkText text-[12px] lg:text-[14px]"></i>
          </div>
        </Popover.Button>

        <Popover.Panel className="SpeechHistory absolute z-10 mx-1 bottom-14 w-full max-w-md bg-white dark:bg-darkPrimary shadow-xl rounded-2xl h-ful">
          <h2 className="relative text-lg font-medium leading-6 text-gray-900 dark:text-white p-5 pb-3 px-3">
            {t('speech-services.subtitle-history-modal-title')}
            <Popover.Button className="absolute top-7 right-3 w-[25px] h-[25px] outline-none">
              <span className="inline-block h-[1px] w-[20px] bg-primaryColor dark:bg-darkText absolute top-0 left-0 rotate-45" />
              <span className="inline-block h-[1px] w-[20px] bg-primaryColor dark:bg-darkText absolute top-0 left-0 -rotate-45" />
            </Popover.Button>
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
            <div ref={scrollToRef} />
          </div>
        </Popover.Panel>
      </Popover>
    </>
  );
};

export default SubtitleTextsHistory;
