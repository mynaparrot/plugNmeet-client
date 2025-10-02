import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { SpeechIconSVG } from '../../../assets/Icons/SpeechIconSVG';
import { store, useAppDispatch, useAppSelector } from '../../../store';
import { updateDisplaySpeechSettingOptionsModal } from '../../../store/slices/bottomIconsActivitySlice';

const Translation = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const { showTooltip } = useMemo(() => {
    const session = store.getState().session;
    return {
      showTooltip: session.userDeviceType === 'desktop',
    };
  }, []);

  const isActiveDisplaySpeechSettingOptionsModal = useAppSelector(
    (state) => state.bottomIconsActivity.showSpeechSettingOptionsModal,
  );
  const isEnabled = useAppSelector(
    (state) =>
      !!state.session.currentRoom.metadata?.roomFeatures
        ?.speechToTextTranslationFeatures?.isEnabled,
  );

  const toggleModal = useCallback(() => {
    dispatch(
      updateDisplaySpeechSettingOptionsModal(
        !isActiveDisplaySpeechSettingOptionsModal,
      ),
    );
  }, [dispatch, isActiveDisplaySpeechSettingOptionsModal]);

  if (!isEnabled) {
    return null;
  }

  const wrapperClasses = clsx(
    'translationIcon relative footer-icon cursor-pointer w-11 3xl:w-[52px] h-11 3xl:h-[52px] rounded-[15px] 3xl:rounded-[18px] border-[3px] 3xl:border-4',
    {
      'border-[rgba(124,206,247,0.25)]':
        isActiveDisplaySpeechSettingOptionsModal,
      'border-transparent': !isActiveDisplaySpeechSettingOptionsModal,
    },
  );

  const innerDivClasses = clsx(
    'h-full w-full flex items-center justify-center rounded-[12px] 3xl:rounded-[15px] border border-Gray-300 shadow-sm transition-all duration-300 hover:bg-gray-100 text-Gray-950',
    {
      'has-tooltip': showTooltip,
      'bg-gray-100': isActiveDisplaySpeechSettingOptionsModal,
      'bg-white': !isActiveDisplaySpeechSettingOptionsModal,
    },
  );

  return (
    <div className={wrapperClasses} onClick={toggleModal}>
      <div className={innerDivClasses}>
        <span className="tooltip">
          {isActiveDisplaySpeechSettingOptionsModal
            ? t('footer.icons.hide-translation-settings')
            : t('footer.icons.show-translation-settings')}
        </span>
        <SpeechIconSVG classes="text-Blue2-950 h-6 w-auto" />
      </div>
    </div>
  );
};

export default Translation;
