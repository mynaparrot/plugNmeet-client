import React, { useState } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { useTranslation } from 'react-i18next';

import { useAppSelector, RootState, useAppDispatch } from '../../store';
import { toggleStartup } from '../../store/slices/sessionSlice';
import { updateShowMicrophoneModal } from '../../store/slices/bottomIconsActivitySlice';
import { updateRoomAudioVolume } from '../../store/slices/roomSettingsSlice';

interface StartupJoinModalProps {
  onCloseModal(): void;
}

const isStartupSelector = createSelector(
  (state: RootState) => state.session,
  (session) => session.isStartup,
);
const StartupJoinModal = ({ onCloseModal }: StartupJoinModalProps) => {
  const [open, setOpen] = useState<boolean>(true);
  const isStartup = useAppSelector(isStartupSelector);
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const onClose = (noAudio = false) => {
    setOpen(false);
    dispatch(toggleStartup(false));
    if (noAudio) {
      dispatch(updateRoomAudioVolume(0));
    }
    onCloseModal();
  };

  const shareMic = () => {
    dispatch(updateShowMicrophoneModal(true));
    onClose();
  };

  const render = () => {
    return (
      <div
        id="startupJoinModal"
        className={`${
          open
            ? 'opacity-1 pointer-events-auto'
            : 'pointer-events-none opacity-0'
        } join-the-audio-popup absolute transition ease-in top-0 left-0 w-full h-full z-[999] bg-white/80 dark:bg-darkPrimary/90 px-6 flex items-center justify-center`}
      >
        <div className="popup-inner bg-white dark:bg-darkPrimary/90 w-full max-w-md rounded-2xl shadow-header relative px-6 py-14">
          <button
            className="close-btn absolute top-8 right-6 w-[25px] h-[25px] outline-none"
            type="button"
            onClick={() => onClose(true)}
          >
            <span className="inline-block h-[1px] w-[20px] bg-primaryColor dark:bg-darkText absolute top-0 left-0 rotate-45" />
            <span className="inline-block h-[1px] w-[20px] bg-primaryColor dark:bg-darkText absolute top-0 left-0 -rotate-45" />
          </button>
          <p className="text-base md:text-lg primaryColor dark:text-darkText font-normal mb-5 text-center">
            {t('app.how-to-join')}
          </p>
          <div className="btn flex justify-center">
            <button
              type="button"
              className="microphone bg-transparent ltr:mr-4 rtl:ml-4 text-center"
              onClick={() => shareMic()}
            >
              <div className="h-[40px] md:h-[60px] w-[40px] md:w-[60px] m-auto overflow-hidden rounded-full bg-[#F2F2F2] dark:bg-darkSecondary3 hover:bg-[#ECF4FF] hover:dark:bg-darkSecondary2 mb-1 flex items-center justify-center cursor-pointer">
                <i className="pnm-mic-unmute primaryColor dark:text-secondaryColor text-xl" />
              </div>
              <p className="text-sm md:text-base primaryColor dark:text-darkText font-normal">
                {t('app.microphone')}
              </p>
            </button>
            <button
              type="button"
              id="listenOnlyJoin"
              className="headphone bg-transparent ltr:ml-4 rtl:mr-4 text-center"
            >
              <div
                className="camera h-[40px] md:h-[60px] w-[40px] md:w-[60px] m-auto overflow-hidden rounded-full bg-[#F2F2F2] dark:bg-darkSecondary3 hover:bg-[#ECF4FF] hover:dark:bg-darkSecondary2 mb-1 flex items-center justify-center cursor-pointer"
                onClick={() => onClose()}
              >
                <i className="pnm-listen-only primaryColor dark:text-secondaryColor text-xl" />
              </div>
              <p className="text-sm md:text-base primaryColor dark:text-darkText font-normal">
                {t('app.listen-only')}
              </p>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return isStartup ? (
    <div className="absolute z-50 w-full h-full top-0 left-0">{render()}</div>
  ) : null;
};

export default StartupJoinModal;
