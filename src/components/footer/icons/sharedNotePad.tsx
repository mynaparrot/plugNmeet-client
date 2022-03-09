import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createSelector } from '@reduxjs/toolkit';

import {
  RootState,
  store,
  useAppDispatch,
  useAppSelector,
} from '../../../store';
import { updateIsActiveSharedNotePad } from '../../../store/slices/bottomIconsActivitySlice';

const isActiveSharedNotePadSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity.isActiveSharedNotePad,
  (isActiveSharedNotePad) => isActiveSharedNotePad,
);
const sharedNotepadStatusSelector = createSelector(
  (state: RootState) =>
    state.session.currentRoom.metadata?.room_features.shared_note_pad_features
      .is_active,
  (is_active) => is_active,
);

const SharedNotePad = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const showTooltip = store.getState().session.userDeviceType === 'desktop';
  const [iconCSS, setIconCSS] = useState<string>('brand-color1');
  const isActiveSharedNotePad = useAppSelector(isActiveSharedNotePadSelector);
  const sharedNotepadStatus = useAppSelector(sharedNotepadStatusSelector);

  useEffect(() => {
    if (isActiveSharedNotePad) {
      setIconCSS('brand-color2');
    } else {
      setIconCSS('brand-color1');
    }
  }, [isActiveSharedNotePad]);

  const text = () => {
    if (isActiveSharedNotePad) {
      return t('footer.icons.show-shared-notepad');
    } else {
      return t('footer.icons.hide-shared-notepad');
    }
  };

  const toggleSharedNotePad = () => {
    dispatch(updateIsActiveSharedNotePad(!isActiveSharedNotePad));
  };

  const render = () => {
    return (
      <div
        className={`share-screen h-[35px] lg:h-[40px] w-[35px] lg:w-[40px] relative rounded-full bg-[#F2F2F2] hover:bg-[#ECF4FF] mr-3 lg:mr-6 hidden md:flex items-center justify-center cursor-pointer ${
          showTooltip ? 'has-tooltip' : ''
        }`}
        onClick={() => toggleSharedNotePad()}
      >
        <span className="tooltip rounded shadow-lg p-1 bg-gray-100 text-red-500 -mt-16 text-[10px] w-max">
          {text()}
        </span>
        <React.Fragment>
          <i className={`pnm-notepad ${iconCSS} text-[12px] lg:text-[16px]`} />
        </React.Fragment>
      </div>
    );
  };

  return <>{sharedNotepadStatus ? render() : null}</>;
};

export default SharedNotePad;
