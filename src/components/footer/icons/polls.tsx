import React, { useEffect } from 'react';

import { useAppDispatch, useAppSelector } from '../../../store';
import {
  updateIsActivePollsPanel,
  updateIsEnabledExtendedVerticalCamView,
} from '../../../store/slices/bottomIconsActivitySlice';
import { PollsIconSVG } from '../../../assets/Icons/PollsIconSVG';

const PollsIcon = () => {
  const dispatch = useAppDispatch();

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

  const togglePollsPanel = () => {
    if (!isActivePollsPanel) {
      dispatch(updateIsEnabledExtendedVerticalCamView(false));
    }
    dispatch(updateIsActivePollsPanel(!isActivePollsPanel));
  };

  return isActive ? (
    <div
      className={`pollsIcon relative footer-icon cursor-pointer w-11 3xl:w-[52px] h-11 3xl:h-[52px] rounded-[15px] 3xl:rounded-[18px] border-[3px] 3xl:border-4 ${isActivePollsPanel ? 'border-[rgba(124,206,247,0.25)]' : 'border-transparent'}`}
      onClick={() => togglePollsPanel()}
    >
      <div
        className={`h-full w-full flex items-center justify-center rounded-[12px] 3xl:rounded-[15px] border border-Gray-300 shadow-sm transition-all duration-300 hover:bg-gray-100 text-Gray-950  ${isActivePollsPanel ? 'bg-gray-100' : 'bg-white'}`}
      >
        <PollsIconSVG />
      </div>
    </div>
  ) : null;
};

export default PollsIcon;
