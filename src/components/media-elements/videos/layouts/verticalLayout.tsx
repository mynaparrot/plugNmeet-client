import React, { ReactElement, useMemo } from 'react';
import { createSelector } from '@reduxjs/toolkit';

import { RootState, useAppDispatch, useAppSelector } from '../../../../store';
import { updateIsEnabledExtendedVerticalCamView } from '../../../../store/slices/bottomIconsActivitySlice';
import { getElmsForPCExtendedVerticalView } from '../helpers/utils';
import { ArrowRight } from '../../../../assets/Icons/ArrowRight';

interface IVerticalLayoutProps {
  participantsToRender: Array<ReactElement>;
  pinParticipant?: ReactElement;
  totalNumWebcams: number;
  currentPage: number;
}

const canShowExtendButtonSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity.isActiveParticipantsPanel,
  (state: RootState) => state.bottomIconsActivity.isActiveChatPanel,
  (state: RootState) => state.bottomIconsActivity.isActivePollsPanel,
  (isActiveParticipantsPanel, isActiveChatPanel, isActivePollsPanel) =>
    !isActiveParticipantsPanel && !isActiveChatPanel && !isActivePollsPanel,
);

const VerticalLayout = ({
  participantsToRender,
  pinParticipant,
  totalNumWebcams,
  currentPage,
}: IVerticalLayoutProps) => {
  const dispatch = useAppDispatch();
  const isEnabledExtendedVerticalCamView = useAppSelector(
    (state) => state.bottomIconsActivity.isEnabledExtendedVerticalCamView,
  );
  const canShowExtendButton = useAppSelector(canShowExtendButtonSelector);

  const videoParticipantsElms = useMemo(() => {
    if (!isEnabledExtendedVerticalCamView) {
      return participantsToRender;
    }
    return getElmsForPCExtendedVerticalView(participantsToRender);
  }, [isEnabledExtendedVerticalCamView, participantsToRender]);

  const wrapperClasses = `vertical-webcams-wrapper absolute right-0 top-0 bg-white h-full p-3 transition-all duration-300 z-20 ${
    isEnabledExtendedVerticalCamView
      ? 'w-[416px] flex flex-col justify-center extended-view-wrap'
      : 'w-[212px] not-extended'
  }`;

  const innerClasses = `inner row-count-${
    videoParticipantsElms.length
  } total-cam-${totalNumWebcams} group-total-cam-${
    participantsToRender.length
  } page-${currentPage} ${
    isEnabledExtendedVerticalCamView
      ? 'flex gap-3 h-full flex-col justify-center'
      : 'h-full flex flex-col justify-center gap-3 bg-white z-20'
  } ${pinParticipant ? 'has-pin-cam' : ''}`;

  return (
    <div className={wrapperClasses}>
      <div className={innerClasses}>
        {pinParticipant && (
          <div
            className={`pinCam-item video-camera-item order-2! ${
              isEnabledExtendedVerticalCamView ? 'camera-row-wrap' : ''
            }`}
          >
            {pinParticipant}
          </div>
        )}
        {videoParticipantsElms}
      </div>
      {canShowExtendButton && (
        <button
          onClick={() =>
            dispatch(
              updateIsEnabledExtendedVerticalCamView(
                !isEnabledExtendedVerticalCamView,
              ),
            )
          }
          className="extend-button cursor-pointer absolute top-1/2 -translate-y-1/2 left-0 w-4 h-6 rounded-l-full bg-DarkBlue flex items-center justify-center transition-all duration-300 opacity-0"
        >
          <span
            className={`${
              isEnabledExtendedVerticalCamView ? '' : 'rotate-180'
            }`}
          >
            <ArrowRight />
          </span>
        </button>
      )}
    </div>
  );
};

export default VerticalLayout;
