import React, { ReactElement, useCallback, useEffect, useRef } from 'react';
import { Track, VideoTrack } from 'livekit-client';

import { useAppDispatch } from '../../../../store';
import { updateIsEnabledExtendedVerticalCamView } from '../../../../store/slices/bottomIconsActivitySlice';
import { ArrowRight } from '../../../../assets/Icons/ArrowRight';
import { VideoParticipantProps } from '../videoParticipant';

const MAX_NUM_WEBCAMS_PIP = 5,
  PIP_WINDOW_HEIGHT = 600,
  PIP_WINDOW_WIDTH = 280;

interface IVerticalLayoutProps {
  allParticipants: ReactElement<VideoParticipantProps>[];
  participantsToRender: Array<ReactElement>;
  pinParticipant?: ReactElement;
  totalNumWebcams: number;
  currentPage: number;
  isSidebarOpen: boolean;
  isEnabledExtendedVerticalCamView: boolean;
  isDesktop: boolean;
}

const VerticalLayout = ({
  allParticipants,
  participantsToRender,
  pinParticipant,
  totalNumWebcams,
  currentPage,
  isSidebarOpen,
  isEnabledExtendedVerticalCamView,
  isDesktop,
}: IVerticalLayoutProps) => {
  const dispatch = useAppDispatch();
  const pipWindowRef = useRef<Window | null>(null);
  const tracksToDetachRef = useRef<
    { track: VideoTrack; videoElm: HTMLVideoElement }[]
  >([]);

  const toggleExtendedVerticalCamView = useCallback(() => {
    dispatch(
      updateIsEnabledExtendedVerticalCamView(!isEnabledExtendedVerticalCamView),
    );
  }, [dispatch, isEnabledExtendedVerticalCamView]);

  const renderPipView = useCallback(
    (participants: ReactElement<VideoParticipantProps>[]) => {
      const pipWindow = pipWindowRef.current;
      if (!pipWindow) return;

      // First, clear previous content & detach old tracks
      while (pipWindow.document.body.firstChild) {
        pipWindow.document.body.removeChild(pipWindow.document.body.firstChild);
      }
      tracksToDetachRef.current.forEach(({ track, videoElm }) => {
        track.detach(videoElm);
      });
      tracksToDetachRef.current = [];

      // Now create a flex container for a single-column layout
      const container = document.createElement('div');
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.width = '100%';
      container.style.height = '100%';
      pipWindow.document.body.appendChild(container);

      // Finally iterate through participants, create video elements, and attach tracks
      participants.slice(0, MAX_NUM_WEBCAMS_PIP).forEach((p) => {
        const participant = p.props.participant;
        const videoTrack = participant.getTrackPublication(
          Track.Source.Camera,
        )?.videoTrack;

        if (videoTrack) {
          const video = document.createElement('video');
          video.style.width = '100%';
          video.style.marginBottom = '8px';
          video.autoplay = true;
          video.muted = true;
          video.title = p.props.participant.name ?? '';
          videoTrack.attach(video);
          container.appendChild(video);
          tracksToDetachRef.current.push({
            track: videoTrack,
            videoElm: video,
          });
        }
      });
    },
    [],
  );

  const openPip = useCallback(async () => {
    try {
      const pipWindow = await (
        window as any
      ).documentPictureInPicture.requestWindow({
        width: PIP_WINDOW_WIDTH,
        height: PIP_WINDOW_HEIGHT,
      });
      pipWindowRef.current = pipWindow;

      // Set base styles for the PiP window
      pipWindow.document.documentElement.style.height = '100%';
      pipWindow.document.body.style.height = '100%';
      pipWindow.document.body.style.margin = '0';
      pipWindow.document.body.style.background = '#000';

      // Initial render
      renderPipView(allParticipants);

      // When the Picture-in-Picture window closes, detach all tracks.
      pipWindow.addEventListener('pagehide', () => {
        tracksToDetachRef.current.forEach(({ track, videoElm }) => {
          track.detach(videoElm);
        });
        tracksToDetachRef.current = [];
        pipWindowRef.current = null;
      });
    } catch (error) {
      console.error('Failed to open PiP window:', error);
    }
  }, [allParticipants, renderPipView]);

  useEffect(() => {
    // If PiP window is open, re-render its content when participants change
    if (pipWindowRef.current) {
      renderPipView(allParticipants);
    }
  }, [allParticipants, renderPipView]);

  useEffect(() => {
    // clean everything up when the component unmounts
    return () => {
      if (pipWindowRef.current) {
        tracksToDetachRef.current.forEach(({ track, videoElm }) => {
          track.detach(videoElm);
        });
        pipWindowRef.current.close();
        pipWindowRef.current = null;
      }
    };
  }, []);

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
      {(window as any).documentPictureInPicture && (
        <button
          className="cam-pip cursor-pointer w-7 h-7 rounded-full bg-Gray-950/50 shadow-shadowXS flex items-center justify-center absolute top-2 right-2 z-50 opacity-0 group-hover:opacity-100 transition-all duration-300"
          onClick={openPip}
          title="Picture-in-Picture"
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
