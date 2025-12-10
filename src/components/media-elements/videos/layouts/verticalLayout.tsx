import React, { ReactElement, useCallback } from 'react';

import { useAppDispatch } from '../../../../store';
import { updateIsEnabledExtendedVerticalCamView } from '../../../../store/slices/bottomIconsActivitySlice';
import { ArrowRight } from '../../../../assets/Icons/ArrowRight';

interface IVerticalLayoutProps {
  participantsToRender: Array<ReactElement>;
  pinParticipant?: ReactElement;
  totalNumWebcams: number;
  currentPage: number;
  isSidebarOpen: boolean;
  isEnabledExtendedVerticalCamView: boolean;
  isDesktop: boolean;
}

const VerticalLayout = ({
  participantsToRender,
  pinParticipant,
  totalNumWebcams,
  currentPage,
  isSidebarOpen,
  isEnabledExtendedVerticalCamView,
  isDesktop,
}: IVerticalLayoutProps) => {
  const dispatch = useAppDispatch();

  const toggleExtendedVerticalCamView = useCallback(() => {
    dispatch(
      updateIsEnabledExtendedVerticalCamView(!isEnabledExtendedVerticalCamView),
    );
  }, [dispatch, isEnabledExtendedVerticalCamView]);

  const wrapperClasses = `vertical-webcams-wrapper group absolute right-0 bottom-0 xl:bottom-auto xl:top-0 bg-Gray-25 dark:bg-dark-primary border-t xl:border-t-0 xl:border-l border-Gray-200 dark:border-Gray-800 h-[126px] lg:h-[200px] xl:h-full p-3 transition-all duration-300 z-20 ${
    isEnabledExtendedVerticalCamView
      ? 'w-full xl:w-[416px] flex flex-col justify-center extended-view-wrap'
      : 'w-full xl:w-[212px] not-extended'
  }`;

  const innerClasses = `inner row-count-${
    participantsToRender.length
  } total-cam-${totalNumWebcams} group-total-cam-${
    totalNumWebcams
  } page-${currentPage} ${
    isEnabledExtendedVerticalCamView
      ? 'flex gap-3 h-full xl:flex-col justify-center w-full'
      : 'h-full flex xl:flex-col justify-center gap-3 z-20'
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
        {participantsToRender}
      </div>
      {isDesktop && !isSidebarOpen && (
        <button
          onClick={toggleExtendedVerticalCamView}
          className="extend-button cursor-pointer absolute top-1/2 -translate-y-1/2 left-0 w-4 h-6 rounded-l-full bg-DarkBlue hidden xl:flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100 group-hover:-left-4"
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
