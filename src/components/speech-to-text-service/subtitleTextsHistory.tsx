import React, { Fragment, useState } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { Dialog, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import { RootState, useAppSelector } from '../../store';

const lastFinalTextsSelector = createSelector(
  (state: RootState) => state.speechServices.lastFinalTexts,
  (lastFinalTexts) => lastFinalTexts,
);

const SubtitleTextsHistory = () => {
  const { t } = useTranslation();

  const lastFinalTexts = useAppSelector(lastFinalTextsSelector);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  return (
    <div
      className="show-speech-setting absolute bottom-1 left-1"
      style={{ marginLeft: '50px' }}
    >
      <Transition appear show={showHistoryModal} as={Fragment}>
        <Dialog
          as="div"
          className="fixed inset-0 z-[9999] overflow-y-auto"
          onClose={() => false}
        >
          <div className="min-h-screen px-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
            </Transition.Child>

            <span
              className="inline-block h-screen align-middle"
              aria-hidden="true"
            >
              &#8203;
            </span>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <div className="inline-block w-full max-w-lg p-6 my-8 overflow-[initial] text-left align-middle transition-all transform bg-white dark:bg-darkPrimary shadow-xl rounded-2xl">
                <button
                  className="close-btn absolute top-8 right-6 w-[25px] h-[25px] outline-none"
                  type="button"
                  onClick={() => setShowHistoryModal(false)}
                >
                  <span className="inline-block h-[1px] w-[20px] bg-primaryColor dark:bg-darkText absolute top-0 left-0 rotate-45" />
                  <span className="inline-block h-[1px] w-[20px] bg-primaryColor dark:bg-darkText absolute top-0 left-0 -rotate-45" />
                </button>

                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-2"
                >
                  {t('speech-services.subtitle-history-modal-title')}
                </Dialog.Title>
                <hr />
                <div className="mt-6">{lastFinalTexts.join(' ')}</div>
              </div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
      <button onClick={() => setShowHistoryModal(true)}>
        <div className="microphone footer-icon relative h-[35px] lg:h-[40px] w-[35px] lg:w-[40px] rounded-full bg-[#F2F2F2] dark:bg-darkSecondary2 hover:bg-[#ECF4FF] mr-3 lg:mr-6 flex items-center justify-center cursor-pointer">
          <i className="pnm-closed-captioning primaryColor dark:text-darkText text-[12px] lg:text-[14px]"></i>
        </div>
      </button>
    </div>
  );
};

export default SubtitleTextsHistory;
