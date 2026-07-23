import React, {
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import { useAppDispatch } from '../../../../store';
import { updateIsEnabledExtendedVerticalCamView } from '../../../../store/slices/bottomIconsActivitySlice';
import { ArrowRight } from '../../../../assets/Icons/ArrowRight';
import { VideoParticipantProps } from '../videoParticipant';
import PipVideoTrack from './pip/pipVideoTrack';
import {
  DocumentPictureInPictureWindow,
  getPipItems,
  injectPipStyles,
  IPipItem,
  PIP_WINDOW_HEIGHT,
  PIP_WINDOW_WIDTH,
} from './pip/utils';
import { useDeviceInfo } from '../helpers/useDeviceInfo';

interface IVerticalLayoutProps {
  pipParticipants: ReactElement<VideoParticipantProps>[];
  participantsToRender: React.ReactElement<
    unknown,
    string | React.JSXElementConstructor<any>
  >[];
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
  const { t } = useTranslation();
  const { isMobile, isTablet, isPortrait } = useDeviceInfo();

  const [pipWindow, setPipWindow] = useState<Window | null>(null);

  const pipWindowRef = useRef<Window | null>(null);
  const isMountedRef = useRef(false);

  const isDocumentPipSupported =
    typeof window !== 'undefined' &&
    typeof (window as DocumentPictureInPictureWindow).documentPictureInPicture
      ?.requestWindow === 'function';

  const pipItems = useMemo<IPipItem[]>(() => {
    return getPipItems(pipParticipants);
  }, [pipParticipants]);

  const toggleExtendedVerticalCamView = useCallback(() => {
    dispatch(
      updateIsEnabledExtendedVerticalCamView(!isEnabledExtendedVerticalCamView),
    );
  }, [dispatch, isEnabledExtendedVerticalCamView]);

  const openPip = useCallback(async () => {
    try {
      if (typeof window === 'undefined') return;

      const documentPictureInPicture = (
        window as DocumentPictureInPictureWindow
      ).documentPictureInPicture;

      if (typeof documentPictureInPicture?.requestWindow !== 'function') {
        return;
      }

      if (pipWindowRef.current && !pipWindowRef.current.closed) {
        pipWindowRef.current.focus();
        return;
      }

      const win = await documentPictureInPicture.requestWindow({
        width: PIP_WINDOW_WIDTH,
        height: PIP_WINDOW_HEIGHT,
      });

      pipWindowRef.current = win;
      injectPipStyles(win);

      // Explicitly pull focus back to the PiP window after OS/browser focus shifts.
      setTimeout(() => {
        if (!win.closed) {
          win.focus();
        }
      }, 0);

      win.addEventListener(
        'pagehide',
        () => {
          pipWindowRef.current = null;

          if (isMountedRef.current) {
            setPipWindow(null);
          }
        },
        { once: true },
      );

      if (isMountedRef.current) {
        setPipWindow(win);
      }
    } catch (error) {
      console.error('Failed to open PiP window:', error);

      pipWindowRef.current = null;

      if (isMountedRef.current) {
        setPipWindow(null);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      // Only close on unmount if the window exists and has already established state.
      if (pipWindowRef.current && !pipWindowRef.current.closed) {
        pipWindowRef.current.close();
      }

      pipWindowRef.current = null;
    };
  }, []);

  const shouldBeAtBottom = isMobile || (isTablet && isPortrait);

  const wrapperClasses = `vertical-webcams-wrapper group absolute z-20 p-3 transition-all duration-300 bg-Gray-25 dark:bg-dark-primary border-Gray-200 dark:border-Gray-800 ${
    shouldBeAtBottom
      ? 'vertical-bottom-layout bottom-0 left-0 right-0 h-[126px] border-t w-full flex flex-row justify-center not-extended'
      : `top-0 right-0 h-full border-l flex flex-col justify-center ${
          isEnabledExtendedVerticalCamView
            ? 'xl:w-[416px] extended-view-wrap'
            : 'md:w-[212px] not-extended'
        }`
  }`;

  const innerClasses = `inner row-count-${participantsToRender.length} total-cam-${totalNumWebcams} group-total-cam-${totalNumWebcams} page-${currentPage} h-full w-full flex gap-3 z-20 ${
    shouldBeAtBottom ? 'flex-row justify-center items-center' : 'flex-col'
  } ${pinParticipant ? 'has-pin-cam' : ''}`;

  return (
    <>
      {pipWindow &&
        createPortal(
          <div
            className="pip-flex-container"
            style={
              {
                '--pip-count': Math.max(pipItems.length, 1),
              } as React.CSSProperties & Record<'--pip-count', number>
            }
          >
            {pipItems.map((item) => (
              <PipVideoTrack
                key={item.key}
                videoTrack={item.videoTrack}
                name={item.name}
                isCameraMuted={item.isCameraMuted}
              />
            ))}
          </div>,
          pipWindow.document.body,
        )}

      <div className={wrapperClasses}>
        {isDocumentPipSupported && (
          <button
            type="button"
            className="cam-pip cursor-pointer w-7 h-7 rounded-full bg-Gray-950/50 shadow-shadowXS flex items-center justify-center absolute top-2 right-2 z-50 opacity-0 group-hover:opacity-100 transition-all duration-300"
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
            onMouseDown={(event) => {
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void openPip();
            }}
            title={t('pip')}
          >
            <i className="icon pnm-pip text-[14px] text-white" />
          </button>
        )}

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
            type="button"
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
    </>
  );
};

export default VerticalLayout;
