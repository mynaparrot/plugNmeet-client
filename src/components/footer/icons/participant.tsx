import React, { useState, useEffect } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { useTranslation } from 'react-i18next';

import {
  useAppSelector,
  RootState,
  useAppDispatch,
  store,
} from '../../../store';
import { updateIsActiveParticipantsPanel } from '../../../store/slices/bottomIconsActivitySlice';

const isActiveParticipantsPanelSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity.isActiveParticipantsPanel,
  (isActiveParticipantsPanel) => isActiveParticipantsPanel,
);

const ParticipantIcon = () => {
  const dispatch = useAppDispatch();
  const showTooltip = store.getState().session.userDeviceType === 'desktop';
  const { t } = useTranslation();

  const isActiveParticipantsPanel = useAppSelector(
    isActiveParticipantsPanelSelector,
  );
  const [iconCSS, setIconCSS] = useState<string>('brand-color1');

  useEffect(() => {
    if (isActiveParticipantsPanel) {
      setIconCSS('brand-color2');
    } else {
      setIconCSS('brand-color1');
    }
  }, [isActiveParticipantsPanel]);

  const toggleParticipantsPanel = () => {
    dispatch(updateIsActiveParticipantsPanel(!isActiveParticipantsPanel));
  };

  return (
    <div
      className={`participants h-[35px] lg:h-[40px] w-[35px] lg:w-[40px] mr-3 lg:mr-6 overflow-hidden rounded-full bg-[#F2F2F2] hover:bg-[#ECF4FF] flex items-center justify-center cursor-pointer ${
        showTooltip ? 'has-tooltip' : ''
      }`}
      onClick={() => toggleParticipantsPanel()}
    >
      <span className="tooltip rounded shadow-lg p-1 bg-gray-100 text-red-500 -mt-16 text-[10px] w-max">
        {isActiveParticipantsPanel
          ? t('footer.icons.hide-users-list')
          : t('footer.icons.show-users-list')}
      </span>

      <i className={`pnm-participant ${iconCSS} text-[12px] lg:text-[16px]`} />
    </div>
  );
};

export default ParticipantIcon;
