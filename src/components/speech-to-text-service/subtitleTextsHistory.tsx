import React, { Fragment, useState } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { Dialog, Transition, Popover } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import { RootState, useAppSelector } from '../../store';

const lastFinalTextsSelector = createSelector(
  (state: RootState) => state.speechServices.lastFinalTexts,
  (lastFinalTexts) => lastFinalTexts,
);

const SubtitleTextsHistory = () => {
  const { t } = useTranslation();

  const lastFinalTexts = useAppSelector(lastFinalTextsSelector);
  // const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  return (
    <>
      {/* <div
        className="show-speech-setting absolute bottom-1 left-1"
        style={{ marginLeft: '50px' }}
      >
        <Transition appear show={showHistoryModal} as={Fragment}>
          <Dialog
            as="div"
            className="fixed inset-0 z-[9999] overflow-y-auto"
            onClose={() => false}
          >
            <div className="min-h-screen px-1">
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
                className="inline-block h-screen align-bottom"
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
                <div className="inline-block w-full max-w-lg p-6 mb-28 overflow-[initial] text-left align-middle transition-all transform bg-white dark:bg-darkPrimary shadow-xl rounded-2xl">
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
                  <div className="py-3 text-primary dark:text-white">
                    <div className="sentence w-full pt-2">
                      <p className="date text-sm pb-1 primaryColor dark:text-darkText">
                        Today
                      </p>
                      <p className="message-content max-w-fit shadow-footer text-xs bg-secondaryColor text-white py-1 px-2 rounded">
                        {lastFinalTexts.join(' ')}
                      </p>
                    </div>
                  </div>
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
      </div> */}
      <Popover className="subtitleTextsHistory relative">
        <Popover.Button className="absolute left-[2.7rem] lg:left-[3.1rem] bottom-1">
          <div className="microphone footer-icon relative h-[35px] lg:h-[40px] w-[35px] lg:w-[40px] rounded-full bg-[#F2F2F2] dark:bg-darkSecondary2 hover:bg-[#ECF4FF] flex items-center justify-center cursor-pointer has-tooltip">
            <span className="tooltip">Speech to texts history</span>
            <i className="pnm-closed-captioning primaryColor dark:text-darkText text-[12px] lg:text-[14px]"></i>
          </div>
        </Popover.Button>

        <Popover.Panel className="SpeechHistory absolute z-10 mx-1 bottom-14 w-full max-w-md bg-white dark:bg-darkPrimary shadow-xl rounded-2xl">
          <h2 className="relative text-lg font-medium leading-6 text-gray-900 dark:text-white p-5 pb-3 px-3">
            {t('speech-services.subtitle-history-modal-title')}
            <Popover.Button className="absolute top-7 right-3 w-[25px] h-[25px] outline-none">
              <span className="inline-block h-[1px] w-[20px] bg-primaryColor dark:bg-darkText absolute top-0 left-0 rotate-45" />
              <span className="inline-block h-[1px] w-[20px] bg-primaryColor dark:bg-darkText absolute top-0 left-0 -rotate-45" />
            </Popover.Button>
          </h2>
          <hr />
          <div className="p-3 pb-8 text-primary dark:text-white">
            <div className="sentence w-full pt-2">
              <p className="date text-sm pb-1 primaryColor dark:text-darkText">
                Today
              </p>
              <p className="message-content max-w-fit shadow-footer text-xs bg-secondaryColor text-white py-1 px-2 rounded">
                {lastFinalTexts.join(' ')}
              </p>
            </div>
          </div>
        </Popover.Panel>
      </Popover>
    </>
  );
};

export default SubtitleTextsHistory;
