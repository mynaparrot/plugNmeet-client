import React, { useState } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { useTranslation } from 'react-i18next';

import { useAppSelector, RootState, useAppDispatch } from '../../store';
import { toggleStartup } from '../../store/slices/sessionSlice';
import { updateShowMicrophoneModal } from '../../store/slices/bottomIconsActivitySlice';

interface StartupJoinModalProps {
  onCloseModal(): void;
}

const isStartupSelector = createSelector(
  (state: RootState) => state.session.isStartup,
  (isStartup) => isStartup,
);
const StartupJoinModal = ({ onCloseModal }: StartupJoinModalProps) => {
  const [open, setOpen] = useState<boolean>(true);
  const isStartup = useAppSelector(isStartupSelector);
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const onClose = () => {
    setOpen(false);
    dispatch(toggleStartup(false));
    onCloseModal();
  };

  const shareMic = () => {
    dispatch(updateShowMicrophoneModal(true));
    onClose();
  };

  const render = () => {
    if (!isStartup) {
      return null;
    }

    return (
      <div
        id="startupJoinModal"
        className={`${
          open
            ? 'opacity-1 pointer-events-auto'
            : 'pointer-events-none opacity-0'
        } join-the-audio-popup fixed transition ease-in top-0 left-0 w-full h-full z-[999] bg-white/80 px-6 flex items-center justify-center`}
      >
        <div className="popup-inner bg-white w-full max-w-md rounded-2xl shadow-header relative px-6 py-14">
          <button
            className="close-btn absolute top-8 right-6 w-[25px] h-[25px] outline-none"
            type="button"
            onClick={() => onClose()}
          >
            <span className="inline-block h-[1px] w-[20px] bg-[#004D90] absolute top-0 left-0 rotate-45" />
            <span className="inline-block h-[1px] w-[20px] bg-[#004D90] absolute top-0 left-0 -rotate-45" />
          </button>
          <p className="text-base md:text-lg text-[#004D90] font-normal mb-5 text-center">
            {t('app.how-to-join')}
          </p>
          <div className="btn flex justify-center">
            <button
              type="button"
              className="microphone bg-transparent mr-4 text-center"
              onClick={() => shareMic()}
            >
              <div className="h-[40px] md:h-[60px] w-[40px] md:w-[60px] m-auto overflow-hidden rounded-full bg-[#F2F2F2] hover:bg-[#ECF4FF] mb-1 flex items-center justify-center cursor-pointer">
                <i className="pnm-mic-unmute brand-color1 text-xl" />
              </div>
              <p className="text-sm md:text-base brand-color1 font-normal">
                {t('app.microphone')}
              </p>
            </button>
            <button
              type="button"
              id="listenOnlyJoin"
              className="headphone bg-transparent ml-4 text-center"
            >
              <div
                className="camera h-[40px] md:h-[60px] w-[40px] md:w-[60px] m-auto overflow-hidden rounded-full bg-[#F2F2F2] hover:bg-[#ECF4FF] mb-1 flex items-center justify-center cursor-pointer"
                onClick={() => onClose()}
              >
                <i className="pnm-listen-only brand-color1 text-xl" />
              </div>
              <p className="text-sm md:text-base brand-color1 font-normal">
                {t('app.listen-only')}
              </p>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return <div>{render()}</div>;
};

export default StartupJoinModal;
