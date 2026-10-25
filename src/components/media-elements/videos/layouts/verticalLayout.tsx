import React, { ReactElement, useCallback } from 'react';

import { useAppDispatch } from '../../../../store';
import { updateIsEnabledExtendedVerticalCamView } from '../../../../store/slices/bottomIconsActivitySlice';
import { ArrowRight } from '../../../../assets/Icons/ArrowRight';
import { VideoParticipantProps } from '../videoParticipant';
import { useDeviceInfo } from '../helpers/useDeviceInfo';
import { APP_LAYOUT_CLASSES } from '../../../../helpers/dimensions';
import WebcamPip from '../../../pip/webcamPip';

interface IVerticalLayoutProps {
  pipParticipants: ReactElement<VideoParticipantProps>[];
  participantsToRender: React.ReactElement<unknown, string | React.JSXElementConstructor<any>>[];
  pinParticipant?: ReactElement;
  totalNumWebcams: number;
  currentPage: number;
  isSidebarOpen: boolean;
  isEnabledExtendedVerticalCamView: boolean;
  isDesktop: boolean;
}

const VerticalLayout = ({
  pipParticipants,
  participantsToRender,
  pinParticipant,
  totalNumWebcams,
  currentPage,
  isSidebarOpen,
  isEnabledExtendedVerticalCamView,
  isDesktop,
}: IVerticalLayoutProps) => {
  const dispatch = useAppDispatch();
  const { isMobile, isTablet, isPortrait } = useDeviceInfo();

  // Pin on top of the strip, page 1 only (currentPage starts at 0, hence <= 1).
  const showPinInStrip = !!pinParticipant && currentPage <= 1;

  const toggleExtendedVerticalCamView = useCallback(() => {
    dispatch(updateIsEnabledExtendedVerticalCamView(!isEnabledExtendedVerticalCamView));
  }, [dispatch, isEnabledExtendedVerticalCamView]);

  // Only push to bottom in portrait; landscape has more horizontal space → right-side.
  const shouldBeAtBottom = (isMobile || isTablet) && isPortrait;
  const strip = APP_LAYOUT_CLASSES.verticalWebcams;

  const wrapperClasses = `vertical-webcams-wrapper group absolute z-20 transition-all duration-300 bg-Gray-25 dark:bg-dark-primary border-Gray-200 dark:border-Gray-800 ${
    shouldBeAtBottom
      ? `vertical-bottom-layout bottom-0 start-0 end-0 ${strip.bottomBarHeight} border-t w-full flex flex-row justify-center items-center px-2 py-1.5 not-extended`
      : `p-2 top-0 end-0 h-full border-s flex flex-col justify-center ${
          isEnabledExtendedVerticalCamView
            ? `${strip.stripWidthExtended} extended-view-wrap`
            : `${isMobile || isTablet ? strip.stripWidthCompact : `${strip.stripWidth} w-[212px]`} not-extended`
        }`
  }`;

  const innerClasses = `inner row-count-${participantsToRender.length} total-cam-${totalNumWebcams} group-total-cam-${totalNumWebcams} page-${currentPage} h-full w-full flex gap-3 z-20 ${
    shouldBeAtBottom ? 'flex-row justify-center items-center' : 'flex-col'
  } ${showPinInStrip ? 'has-pin-cam' : ''}`;

  return (
    <div className={wrapperClasses}>
      <WebcamPip pipParticipants={pipParticipants} />

      <div className={innerClasses}>
        {showPinInStrip && isEnabledExtendedVerticalCamView && (
          <div className="pinCam-item video-camera-item camera-row-wrap order-2!">
            {pinParticipant}
          </div>
        )}

        {participantsToRender}
      </div>

      {isDesktop && !isSidebarOpen && (
        <button
          type="button"
          onClick={toggleExtendedVerticalCamView}
          className="extend-button cursor-pointer absolute top-1/2 -translate-y-1/2 start-0 w-4 h-6 rounded-s-full bg-Gray-950/50 dark:bg-Gray-50 text-white dark:text-Gray-900 shadow-md hidden xl:flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100 group-hover:-start-4"
        >
          <span
            className={`rtl:-scale-x-100 ${isEnabledExtendedVerticalCamView ? '' : 'rotate-180'}`}
          >
            <ArrowRight />
          </span>
        </button>
      )}
    </div>
  );
};

export default VerticalLayout;
