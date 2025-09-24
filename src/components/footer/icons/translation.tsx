import React from 'react';

import { SpeechIconSVG } from '../../../assets/Icons/SpeechIconSVG';
import { useAppDispatch, useAppSelector } from '../../../store';
import { updateDisplaySpeechSettingOptionsModal } from '../../../store/slices/bottomIconsActivitySlice';

const Translation = () => {
  const dispatch = useAppDispatch();

  const speechService = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures
        ?.speechToTextTranslationFeatures,
  );
  const isActiveDisplaySpeechSettingOptionsModal = useAppSelector(
    (state) => state.bottomIconsActivity.showSpeechSettingOptionsModal,
  );

  return (
    speechService &&
    speechService.isEnabled && (
      <div
        className={`translationIcon relative footer-icon cursor-pointer w-11 3xl:w-[52px] h-11 3xl:h-[52px] rounded-[15px] 3xl:rounded-[18px] border-[3px] 3xl:border-4 ${isActiveDisplaySpeechSettingOptionsModal ? 'border-[rgba(124,206,247,0.25)]' : 'border-transparent'}`}
        onClick={() =>
          dispatch(
            updateDisplaySpeechSettingOptionsModal(
              !isActiveDisplaySpeechSettingOptionsModal,
            ),
          )
        }
      >
        <div
          className={`h-full w-full flex items-center justify-center rounded-[12px] 3xl:rounded-[15px] border border-Gray-300 shadow-sm transition-all duration-300 hover:bg-gray-100 text-Gray-950 ${isActiveDisplaySpeechSettingOptionsModal ? 'bg-gray-100' : 'bg-white'}`}
        >
          <SpeechIconSVG classes="text-Blue2-950 h-6 w-auto" />
        </div>
      </div>
    )
  );
};

export default Translation;
