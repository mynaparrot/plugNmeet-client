import React, { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import {
  updateIsActivePollsPanel,
  updateIsEnabledExtendedVerticalCamView,
} from '../../../store/slices/bottomIconsActivitySlice';
import { PollsIconSVG } from '../../../assets/Icons/PollsIconSVG';

const PollsIcon = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const showTooltip = useMemo(
    () => store.getState().session.userDeviceType === 'desktop',
    [],
  );

  const isActive = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.pollsFeatures?.isActive,
  );
  const isActivePollsPanel = useAppSelector(
    (state) => state.bottomIconsActivity.isActivePollsPanel,
  );

  useEffect(() => {
    if (!isActive && isActivePollsPanel) {
      dispatch(updateIsActivePollsPanel(false));
    }
    //eslint-disable-next-line
  }, [isActive]);

  const togglePollsPanel = useCallback(() => {
    dispatch(updateIsActivePollsPanel(!isActivePollsPanel));
    if (!isActivePollsPanel) {
      dispatch(updateIsEnabledExtendedVerticalCamView(false));
    }
  }, [dispatch, isActivePollsPanel]);

  const wrapperClasses = clsx(
    'pollsIcon relative footer-icon cursor-pointer w-11 3xl:w-[52px] h-11 3xl:h-[52px] rounded-[15px] 3xl:rounded-[18px] border-[3px] 3xl:border-4',
    {
      'border-[rgba(124,206,247,0.25)]': isActivePollsPanel,
      'border-transparent': !isActivePollsPanel,
    },
  );

  const innerDivClasses = clsx(
    'h-full w-full flex items-center justify-center rounded-[12px] 3xl:rounded-[15px] border border-Gray-300 shadow-sm transition-all duration-300 hover:bg-gray-100 text-Gray-950',
    {
      'has-tooltip': showTooltip,
      'bg-gray-100': isActivePollsPanel,
      'bg-white': !isActivePollsPanel,
    },
  );

  if (!isActive) {
    return null;
  }

  return (
    <div className={wrapperClasses} onClick={togglePollsPanel}>
      <div className={innerDivClasses}>
        <span className="tooltip">
          {isActivePollsPanel
            ? t('footer.icons.hide-polls-panel')
            : t('footer.icons.show-polls-panel')}
        </span>
        <PollsIconSVG classes="text-Blue2-800" />
      </div>
    </div>
  );
};

export default PollsIcon;
