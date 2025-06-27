import React, { Dispatch, useCallback, useRef } from 'react';
import { PopoverPanel } from '@headlessui/react';
import Draggable from 'react-draggable';
import { useTranslation } from 'react-i18next';

import { store, useAppSelector } from '../../../store';
import InterimTextElms from './interimTextElms';

interface PopoverPanelElmsProps {
  showPopover: boolean;
  setShowPopover: Dispatch<boolean>;
}

const PopoverPanelElms = ({
  showPopover,
  setShowPopover,
}: PopoverPanelElmsProps) => {
  const { t } = useTranslation();
  const lastFinalTexts = useAppSelector(
    (state) => state.speechServices.lastFinalTexts,
  );

  const nodeRef = useRef(null);

  const downloadTexts = useCallback(() => {
    if (!lastFinalTexts.length) {
      return;
    }

    const texts = lastFinalTexts.map((t) => {
      return `${t.time} ${t.from}:\n${t.text}`;
    });

    const lang = store.getState().speechServices.selectedSubtitleLang;
    const formBlob = new Blob([texts.join('\n\n')], {
      type: 'text/plain;charset=UTF-8',
    });

    const link = document.createElement('a');
    link.setAttribute('href', window.URL.createObjectURL(formBlob));
    link.setAttribute('download', `subtitle_texts_${lang}.txt`);
    document.body.appendChild(link);

    link.click();
    link.remove();
  }, [lastFinalTexts]);

  return (
    <Draggable nodeRef={nodeRef} bounds="#main-area">
      <PopoverPanel
        className="SpeechHistory absolute left-0 z-10 mx-1 bottom-14 w-full max-w-md bg-white dark:bg-dark-primary shadow-xl rounded-2xl h-ful"
        ref={nodeRef}
        static={showPopover}
      >
        <h2 className="relative text-lg font-medium leading-6 text-gray-900 dark:text-white p-5 pb-3 px-3 cursor-move">
          {t('speech-services.subtitle-history-modal-title')}
          <button
            className="absolute ltr:right-10 rtl:left-10 w-[25px] h-[25px] outline-hidden"
            onClick={() => downloadTexts()}
          >
            <i className="pnm-download" />
          </button>
          <button
            className="absolute top-7 ltr:right-3 rtl:left-3 w-[25px] h-[25px] outline-hidden"
            onClick={() => setShowPopover(!showPopover)}
          >
            <span className="inline-block h-[2px] w-[20px] bg-primary-color dark:bg-dark-text absolute top-0 left-0 -rotate-0" />
          </button>
        </h2>
        <hr />
        <div className="p-3 pb-8 text-primary dark:text-white h-[200px] overflow-hidden overflow-y-auto scrollBar scrollBar4">
          {lastFinalTexts.slice(-50).map((t) => {
            return (
              <div key={t.id} className="sentence w-full pt-2">
                <p className="date text-sm pb-1 primaryColor dark:text-dark-text">
                  <span className="text-xs">{t.time}</span> {t.from}:
                </p>
                <p className="message-content max-w-fit shadow-footer text-sm bg-secondary-color text-white py-1 px-2 rounded-sm">
                  {t.text}
                </p>
              </div>
            );
          })}
          <InterimTextElms />
        </div>
      </PopoverPanel>
    </Draggable>
  );
};

export default PopoverPanelElms;
