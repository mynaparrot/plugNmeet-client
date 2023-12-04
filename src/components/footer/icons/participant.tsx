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
import { participantsSelector } from '../../../store/slices/participantSlice';

const isActiveParticipantsPanelSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity,
  (bottomIconsActivity) => bottomIconsActivity.isActiveParticipantsPanel,
);

const ParticipantIcon = () => {
  const dispatch = useAppDispatch();
  const showTooltip = store.getState().session.userDeviceType === 'desktop';
  const { t } = useTranslation();

  const isActiveParticipantsPanel = useAppSelector(
    isActiveParticipantsPanelSelector,
  );
  const participantsTotal = useAppSelector(participantsSelector.selectTotal);
  const [iconCSS, setIconCSS] = useState<string>('primaryColor');

  useEffect(() => {
    if (isActiveParticipantsPanel) {
      setIconCSS('secondaryColor');
    } else {
      setIconCSS('primaryColor dark:text-darkText');
    }
  }, [isActiveParticipantsPanel]);

  const toggleParticipantsPanel = () => {
    dispatch(updateIsActiveParticipantsPanel(!isActiveParticipantsPanel));
  };

  return (
    <div
      className={`participants footer-icon h-[35px] lg:h-[40px] w-[35px] lg:w-[40px] ltr:mr-3 lg:ltr:mr-6 rtl:ml-3 lg:rtl:ml-6 relative rounded-full bg-[#F2F2F2] dark:bg-darkSecondary2 hover:bg-[#ECF4FF] flex items-center justify-center cursor-pointer ${
        showTooltip ? 'has-tooltip' : ''
      }`}
      onClick={() => toggleParticipantsPanel()}
    >
      <span className="tooltip">
        {isActiveParticipantsPanel
          ? t('footer.icons.hide-users-list')
          : t('footer.icons.show-users-list')}
      </span>

      <i className={`pnm-participant ${iconCSS} text-[14px] lg:text-[16px]`} />
      {!isActiveParticipantsPanel ? (
        <div className="unseen-message-count bg-secondaryColor w-5 h-5 rounded-full text-xs text-white absolute -top-2 -right-1 flex justify-center items-center">
          {participantsTotal}
        </div>
      ) : null}
    </div>
  );
};

export default ParticipantIcon;
