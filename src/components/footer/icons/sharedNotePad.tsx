import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import {
  updateIsActiveChatPanel,
  updateIsActiveSharedNotePad,
} from '../../../store/slices/bottomIconsActivitySlice';

const SharedNotePadIcon = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const showTooltip = store.getState().session.userDeviceType === 'desktop';
  const isActiveSharedNotePad = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveSharedNotePad,
  );
  const sharedNotepadStatus = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.sharedNotePadFeatures
        ?.isActive,
  );
  const isRecorder = store.getState().session.currentUser?.isRecorder;

  useEffect(() => {
    // if not active, then we can disable it.
    if (!sharedNotepadStatus) {
      dispatch(updateIsActiveSharedNotePad(false));
    } else {
      dispatch(updateIsActiveSharedNotePad(true));
    }
  }, [sharedNotepadStatus, dispatch]);

  useEffect(() => {
    if (isActiveSharedNotePad) {
      if (!isRecorder) {
        dispatch(updateIsActiveChatPanel(false));
      }
    }
  }, [isActiveSharedNotePad, dispatch, isRecorder]);

  const text = () => {
    if (isActiveSharedNotePad) {
      return t('footer.icons.hide-shared-notepad');
    } else {
      return t('footer.icons.show-shared-notepad');
    }
  };

  const toggleSharedNotePad = async () => {
    dispatch(updateIsActiveSharedNotePad(!isActiveSharedNotePad));
  };

  const iconClasses = clsx('pnm-notepad text-[14px] lg:text-[16px]', {
    secondaryColor: isActiveSharedNotePad,
    'primaryColor dark:text-dark-text': !isActiveSharedNotePad,
  });

  return (
    sharedNotepadStatus && (
      <div
        className={`sharedNotePad relative footer-icon cursor-pointer w-11 3xl:w-[52px] h-11 3xl:h-[52px] rounded-[15px] 3xl:rounded-[18px] border-[3px] 3xl:border-4 ${isActiveSharedNotePad ? 'border-[rgba(124,206,247,0.25)]' : 'border-transparent'}`}
        onClick={() => toggleSharedNotePad()}
      >
        <div
          className={`h-full w-full flex items-center justify-center rounded-[12px] 3xl:rounded-[15px] border border-Gray-300 shadow transition-all duration-300 hover:bg-gray-100 text-Gray-950 ${
            showTooltip ? 'has-tooltip' : ''
          } ${isActiveSharedNotePad ? 'bg-gray-100' : 'bg-white'}`}
        >
          <span className="tooltip">{text()}</span>
          <i className={iconClasses} />
        </div>
      </div>
    )
  );
};

export default SharedNotePadIcon;
