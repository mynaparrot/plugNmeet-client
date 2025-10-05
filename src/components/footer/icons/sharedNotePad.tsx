import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import { updateIsActiveSharedNotePad } from '../../../store/slices/bottomIconsActivitySlice';
import { SharedNotepadIconSVG } from '../../../assets/Icons/SharedNotepadIconSVG';
const SharedNotePadIcon = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { showTooltip } = useMemo(() => {
    const session = store.getState().session;
    return {
      showTooltip: session.userDeviceType === 'desktop',
    };
  }, []);

  const isActiveSharedNotePad = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveSharedNotePad,
  );
  const sharedNotepadStatus = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.sharedNotePadFeatures
        ?.isActive,
  );

  useEffect(() => {
    dispatch(updateIsActiveSharedNotePad(!!sharedNotepadStatus));
  }, [sharedNotepadStatus, dispatch]);

  return (
    sharedNotepadStatus && (
      <div
        className={`sharedNotePad relative footer-icon cursor-pointer w-11 3xl:w-[52px] h-11 3xl:h-[52px] rounded-[15px] 3xl:rounded-[18px] border-[3px] 3xl:border-4 ${isActiveSharedNotePad ? 'border-[rgba(124,206,247,0.25)]' : 'border-transparent'}`}
        onClick={() =>
          dispatch(updateIsActiveSharedNotePad(!isActiveSharedNotePad))
        }
      >
        <div
          className={`h-full w-full flex items-center justify-center rounded-[12px] 3xl:rounded-[15px] border border-Gray-300 shadow transition-all duration-300 hover:bg-gray-100 text-Gray-950 ${
            showTooltip ? 'has-tooltip' : ''
          } ${isActiveSharedNotePad ? 'bg-gray-100' : 'bg-white'}`}
        >
          <span className="tooltip">
            {isActiveSharedNotePad
              ? t('footer.icons.hide-shared-notepad')
              : t('footer.icons.show-shared-notepad')}
          </span>
          <SharedNotepadIconSVG />
        </div>
      </div>
    )
  );
};

export default SharedNotePadIcon;
