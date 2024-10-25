// import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppSelector, useAppDispatch, store } from '../../../store';
import { updateIsActiveParticipantsPanel } from '../../../store/slices/bottomIconsActivitySlice';
import { participantsSelector } from '../../../store/slices/participantSlice';
import { ParticipantsIconSVG } from '../../../assets/Icons/ParticipantsIconSVG';

const ParticipantIcon = () => {
  const dispatch = useAppDispatch();
  const showTooltip = store.getState().session.userDeviceType === 'desktop';
  const { t } = useTranslation();

  const isActiveParticipantsPanel = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveParticipantsPanel,
  );
  const participantsTotal = useAppSelector(participantsSelector.selectTotal);
  // const [iconCSS, setIconCSS] = useState<string>('primaryColor');

  // useEffect(() => {
  //   if (isActiveParticipantsPanel) {
  //     setIconCSS('secondaryColor');
  //   } else {
  //     setIconCSS('primaryColor dark:text-darkText');
  //   }
  // }, [isActiveParticipantsPanel]);

  const toggleParticipantsPanel = () => {
    dispatch(updateIsActiveParticipantsPanel(!isActiveParticipantsPanel));
  };

  return (
    <div
      className={`participants relative footer-icon flex items-center justify-center cursor-pointer w-11 h-11 rounded-[15px] bg-white border border-Gray-300 shadow transition-all duration-300 hover:bg-gray-100 text-Gray-950 ${
        showTooltip ? 'has-tooltip' : ''
      }`}
      onClick={() => toggleParticipantsPanel()}
    >
      <span className="tooltip">
        {isActiveParticipantsPanel
          ? t('footer.icons.hide-users-list')
          : t('footer.icons.show-users-list')}
      </span>

      <ParticipantsIconSVG />
      {!isActiveParticipantsPanel ? (
        <div className="unseen-message-count bg-secondaryColor w-5 h-5 rounded-full text-xs text-white absolute -top-2 -right-1 flex justify-center items-center">
          {participantsTotal}
        </div>
      ) : null}
    </div>
  );
};

export default ParticipantIcon;
