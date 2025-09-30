import React, { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import {
  updateIsActiveParticipantsPanel,
  updateIsEnabledExtendedVerticalCamView,
} from '../../../store/slices/bottomIconsActivitySlice';
import { participantsSelector } from '../../../store/slices/participantSlice';
import { ParticipantsIconSVG } from '../../../assets/Icons/ParticipantsIconSVG';

const ParticipantIcon = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { showTooltip, isRecorder } = useMemo(() => {
    const session = store.getState().session;
    return {
      showTooltip: session.userDeviceType === 'desktop',
      isRecorder: !!session.currentUser?.isRecorder,
    };
  }, []);

  const isActiveParticipantsPanel = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveParticipantsPanel,
  );
  const participantsTotal = useAppSelector(participantsSelector.selectTotal);

  useEffect(() => {
    if (isActiveParticipantsPanel && !isRecorder) {
      dispatch(updateIsEnabledExtendedVerticalCamView(false));
    }
  }, [isActiveParticipantsPanel, isRecorder, dispatch]);

  const toggleParticipantsPanel = useCallback(() => {
    dispatch(updateIsActiveParticipantsPanel(!isActiveParticipantsPanel));
  }, [dispatch, isActiveParticipantsPanel]);

  const wrapperClasses = clsx(
    'participants relative footer-icon cursor-pointer w-11 3xl:w-[52px] h-11 3xl:h-[52px] rounded-[15px] 3xl:rounded-[18px] border-[3px] 3xl:border-4',
    {
      'border-[rgba(124,206,247,0.25)]': isActiveParticipantsPanel,
      'border-transparent': !isActiveParticipantsPanel,
    },
  );

  const innerDivClasses = clsx(
    'h-full w-full flex items-center justify-center rounded-[12px] 3xl:rounded-[15px] border border-Gray-300 shadow transition-all duration-300 hover:bg-gray-100 text-Gray-950',
    {
      'has-tooltip': showTooltip,
      'bg-gray-100': isActiveParticipantsPanel,
      'bg-white': !isActiveParticipantsPanel,
    },
  );

  return (
    <div className={wrapperClasses} onClick={toggleParticipantsPanel}>
      <div className={innerDivClasses}>
        <span className="tooltip">
          {isActiveParticipantsPanel
            ? t('footer.icons.hide-users-list')
            : t('footer.icons.show-users-list')}
        </span>
        <ParticipantsIconSVG />
        {!isActiveParticipantsPanel && (
          <div className="unseen-message-count bg-secondary-color w-4 3xl:w-5 h-4 3xl:h-5 rounded-full text-[10px] 3xl:text-xs text-white absolute -top-2 -right-1 flex justify-center items-center">
            {participantsTotal}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParticipantIcon;
