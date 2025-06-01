// import React, { useState, useEffect } from 'react';
// import { useTranslation } from 'react-i18next';

import { useAppSelector, useAppDispatch, store } from '../../../store';
import {
  updateIsActiveParticipantsPanel,
  updateIsEnabledExtendedVerticalCamView,
} from '../../../store/slices/bottomIconsActivitySlice';
import { participantsSelector } from '../../../store/slices/participantSlice';
import { ParticipantsIconSVG } from '../../../assets/Icons/ParticipantsIconSVG';
import { useEffect } from 'react';

const ParticipantIcon = () => {
  const dispatch = useAppDispatch();
  const showTooltip = store.getState().session.userDeviceType === 'desktop';
  const isRecorder = store.getState().session.currentUser?.isRecorder;
  // const { t } = useTranslation();

  const isActiveParticipantsPanel = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveParticipantsPanel,
  );
  const participantsTotal = useAppSelector(participantsSelector.selectTotal);
  // const [iconCSS, setIconCSS] = useState<string>('primaryColor');

  useEffect(() => {
    // if (isActiveParticipantsPanel) {
    //   setIconCSS('secondaryColor');
    // } else {
    //   setIconCSS('primaryColor dark:text-dark-text');
    // }
    if (isActiveParticipantsPanel && !isRecorder) {
      dispatch(updateIsEnabledExtendedVerticalCamView(false));
    }
    //eslint-disable-next-line
  }, [isActiveParticipantsPanel]);

  const toggleParticipantsPanel = () => {
    dispatch(updateIsActiveParticipantsPanel(!isActiveParticipantsPanel));
  };

  return (
    <div
      className={`participants relative footer-icon cursor-pointer w-11 3xl:w-[52px] h-11 3xl:h-[52px] rounded-[15px] 3xl:rounded-[18px] border-[3px] 3xl:border-4 ${isActiveParticipantsPanel ? 'border-[rgba(124,206,247,0.25)]' : 'border-transparent'}`}
      onClick={() => toggleParticipantsPanel()}
    >
      <div
        className={`h-full w-full flex items-center justify-center rounded-[12px] 3xl:rounded-[15px] border border-Gray-300 shadow transition-all duration-300 hover:bg-gray-100 text-Gray-950 ${
          showTooltip ? 'has-tooltip' : ''
        } ${isActiveParticipantsPanel ? 'bg-gray-100' : 'bg-white'}`}
      >
        {/* <span className="tooltip">
        {isActiveParticipantsPanel
          ? t('footer.icons.hide-users-list')
          : t('footer.icons.show-users-list')}
      </span> */}
        <ParticipantsIconSVG />
        {!isActiveParticipantsPanel ? (
          <div className="unseen-message-count bg-secondary-color w-4 3xl:w-5 h-4 3xl:h-5 rounded-full text-[10px] 3xl:text-xs text-white absolute -top-2 -right-1 flex justify-center items-center">
            {participantsTotal}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ParticipantIcon;
