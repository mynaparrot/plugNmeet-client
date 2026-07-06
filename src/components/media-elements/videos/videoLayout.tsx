import React, {
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import { setWebcamPaginating } from '../../../store/slices/sessionSlice';
import { VideoParticipantProps } from './videoParticipant';
import PinnedLayout from './layouts/pinnedLayout';
import VerticalLayout from './layouts/verticalLayout';
import DefaultLayout from './layouts/defaultLayout';
import {
  formatNextPreButton,
  getElmsForMobile,
  getElmsForPc,
  getElmsForPCExtendedVerticalView,
  getElmsForTablet,
  getTotalWebcamPages,
} from './helpers/utils';
import { useDeviceInfo } from './helpers/useDeviceInfo';
import { AngleDown } from '../../../assets/Icons/AngleDown';
import { updateHasWebcamPages } from '../../../store/slices/roomSettingsSlice';

interface IVideoLayoutProps {
  allParticipants: ReactElement<VideoParticipantProps>[];
  pinParticipant?: ReactElement<VideoParticipantProps>;
  totalNumWebcams: number;
  isVertical?: boolean;
}

interface IPaginatedParticipantsResult {
  pipParticipants: ReactElement<VideoParticipantProps>[];
  participantsToRender: ReactElement[];
}

const DESKTOP_PER_PAGE = 24,
  TABLET_PER_PAGE = 9,
  TABLET_WITH_SIDEBAR_PER_PAGE = 6,
  MOBILE_PER_PAGE = 6,
  MOBILE_WITH_SIDEBAR_PER_PAGE = 4,
  PC_VERTICAL_PER_PAGE = 5,
  PC_EXTENDED_VERTICAL_PER_PAGE = 10,
  TABLET_VERTICAL_PER_PAGE = 4,
  TABLET_VERTICAL_WITH_SIDEBAR_PER_PAGE = 3,
  MOBILE_VERTICAL_PORTRAIT_PER_PAGE = 3,
  MOBILE_VERTICAL_LANDSCAPE_PER_PAGE = 4,
  MOBILE_VERTICAL_WITH_SIDEBAR_PER_PAGE = 2;

const VideoLayout = ({
  allParticipants,
  pinParticipant,
  totalNumWebcams,
  isVertical,
}: IVideoLayoutProps) => {
  const dispatch = useAppDispatch();
  const isEnabledExtendedVerticalCamView = useAppSelector(
    (state) => state.bottomIconsActivity.isEnabledExtendedVerticalCamView,
  );
  const maxNumDisplayWebcams = useAppSelector(
    (state) => state.roomSettings.maxNumDisplayWebcams,
  );

  const isRecorder = store.getState().session.currentUser?.isRecorder;
  const { isMobile, isTablet, isDesktop, isSidebarOpen, isPortrait } =
    useDeviceInfo();

  const [webcamPerPage, setWebcamPerPage] = useState<number>(DESKTOP_PER_PAGE);
  const [currentPage, setCurrentPage] = useState<number>(0);

  // Derive view mode directly from props to prevent unnecessary re-renders via local state
  const enabledVerticalViewMode = useMemo(() => {
    return !!isVertical || typeof pinParticipant !== 'undefined';
  }, [isVertical, pinParticipant]);

  useEffect(() => {
    // 1. Determine the default value based on device type.
    let deviceMax: number;

    if (isTablet) {
      deviceMax = maxNumDisplayWebcams.tablet;
    } else if (isMobile) {
      deviceMax = maxNumDisplayWebcams.mobile;
    } else {
      deviceMax = maxNumDisplayWebcams.desktop;
    }

    // 2. Determine the user's effective limit.
    const effectiveUserLimit =
      deviceMax && deviceMax > 0 ? deviceMax : DESKTOP_PER_PAGE;

    let perPage: number;

    // 3. Calculate the ideal number of webcams based purely on the current layout.
    if (isMobile) {
      if (enabledVerticalViewMode) {
        if (isPortrait) {
          perPage = MOBILE_VERTICAL_PORTRAIT_PER_PAGE;
        } else {
          // landscape
          perPage = isSidebarOpen
            ? MOBILE_VERTICAL_WITH_SIDEBAR_PER_PAGE
            : MOBILE_VERTICAL_LANDSCAPE_PER_PAGE;
        }
      } else {
        // default mode
        perPage = isSidebarOpen
          ? MOBILE_WITH_SIDEBAR_PER_PAGE
          : MOBILE_PER_PAGE;
      }
    } else if (isTablet) {
      if (enabledVerticalViewMode) {
        perPage = isSidebarOpen
          ? TABLET_VERTICAL_WITH_SIDEBAR_PER_PAGE
          : TABLET_VERTICAL_PER_PAGE;
      } else {
        // default mode
        perPage = isSidebarOpen
          ? TABLET_WITH_SIDEBAR_PER_PAGE
          : TABLET_PER_PAGE;
      }
    } else {
      // PC
      if (enabledVerticalViewMode) {
        perPage = isEnabledExtendedVerticalCamView
          ? PC_EXTENDED_VERTICAL_PER_PAGE
          : PC_VERTICAL_PER_PAGE;

        if (pinParticipant) {
          // if vertical view has pin, we will lose space.
          perPage -= isEnabledExtendedVerticalCamView ? 2 : 1;
        }
      } else if (pinParticipant) {
        // if we have a pinned participant, the rest will be in a vertical view
        perPage = isEnabledExtendedVerticalCamView
          ? PC_EXTENDED_VERTICAL_PER_PAGE
          : PC_VERTICAL_PER_PAGE;
      } else {
        perPage = DESKTOP_PER_PAGE;
      }
    }

    // 4. The final value is the MINIMUM of the layout's ideal value and the user's limit.
    //    This ensures the user's data saving preference is always respected as a hard ceiling.
    setWebcamPerPage(Math.min(perPage, effectiveUserLimit));
  }, [
    isEnabledExtendedVerticalCamView,
    enabledVerticalViewMode,
    pinParticipant,
    isMobile,
    isTablet,
    isPortrait,
    isSidebarOpen,
    maxNumDisplayWebcams,
  ]);

  useEffect(() => {
    const hasPages = allParticipants.length > webcamPerPage;
    dispatch(updateHasWebcamPages(hasPages));
  }, [allParticipants.length, webcamPerPage, dispatch]);

  const prePage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  }, []);

  const nextPage = useCallback(() => {
    setCurrentPage((prev) => prev + 1);
  }, []);

  const paginatedParticipants = useMemo<IPaginatedParticipantsResult>(() => {
    // If we don't have enough participants to require pagination, just return them all.
    if (allParticipants.length <= webcamPerPage) {
      return {
        pipParticipants: allParticipants,
        participantsToRender: [...allParticipants],
      };
    }

    // We don't show pagination for recorders.
    // Keep the recorder view limited to the first page worth of participants.
    if (isRecorder) {
      const pipParticipants = allParticipants.slice(0, webcamPerPage);

      return {
        pipParticipants,
        participantsToRender: [...pipParticipants],
      };
    }

    const safeCurrentPage = Math.max(currentPage, 1);

    // Determine if a "Previous" button is needed.
    const hasPrevPage = safeCurrentPage > 1;

    /**
     * Calculate the starting index for the slice.
     *
     * This logic accounts for the shifting number of participant items on each page:
     * - Page 1 can reserve one slot for the "Next" button.
     * - Middle pages can reserve two slots for "Previous" and "Next" buttons.
     * - Last page can reserve one slot for the "Previous" button.
     *
     * This prevents participants from being skipped when pagination buttons consume slots.
     */
    const firstPageParticipantCapacity = webcamPerPage - 1;
    const middlePageParticipantCapacity = webcamPerPage - 2;

    const startIndex = hasPrevPage
      ? firstPageParticipantCapacity +
        (safeCurrentPage - 2) * middlePageParticipantCapacity
      : 0;

    // Start with the max number of items per page. This will be adjusted if we need pagination buttons.
    let itemsToDisplay = webcamPerPage;

    if (hasPrevPage) {
      // Decrement the number of items to show, making space for the "Previous" button.
      itemsToDisplay--;
    }

    // Determine if a "Next" button is needed based on the remaining items.
    const hasNextPage = allParticipants.length > startIndex + itemsToDisplay;

    if (hasNextPage) {
      // Decrement the number of items to show, making space for the "Next" button.
      itemsToDisplay--;
    }

    // Now that we have the final number of items to display, calculate the end index.
    const endIndex = startIndex + itemsToDisplay;

    // Slice the main array to get the participants for the current page.
    // This raw typed list is used by PiP so it follows the current page without relying on wrapped layout elements.
    const pipParticipants = allParticipants.slice(startIndex, endIndex);

    // This render list may include pagination buttons and is passed to the layout helpers.
    const participantsToRender: ReactElement[] = [...pipParticipants];

    // If a "Next" button is needed, create the button component and add it to the end of our display array.
    if (hasNextPage) {
      const potentialNextItems = allParticipants.slice(endIndex);

      participantsToRender.push(
        <button
          key="next-page"
          role="button"
          className="video-camera-item webcam-next-page order-3 relative bg-Gray-900 text-white cursor-pointer flex items-center justify-between"
          onClick={nextPage}
        >
          <div className="left flex-1 flex justify-center items-center absolute top-0 left-0 w-full h-full">
            {formatNextPreButton(potentialNextItems)}
          </div>
          <div className="right pb-4 -rotate-90 absolute top-[calc(50%-12px)] right-0">
            <AngleDown />
          </div>
        </button>,
      );
    }

    // If a "Previous" button is needed, create the button component and add it to the beginning of our display array.
    if (hasPrevPage) {
      // Get the list of participants that were on the previous pages.
      const prevItems = allParticipants.slice(0, startIndex);

      // The unshift() method adds one or more elements to the beginning of an array.
      participantsToRender.unshift(
        <button
          key="prev-page"
          role="button"
          className="video-camera-item webcam-prev-page order-1 relative bg-Gray-900 text-white cursor-pointer flex items-center justify-between"
          onClick={prePage}
        >
          <div className="right rotate-90 absolute top-[calc(50%-12px)] left-3">
            <AngleDown />
          </div>
          <div className="left flex-1 flex justify-center items-center absolute top-0 left-0 w-full h-full">
            {formatNextPreButton(prevItems)}
          </div>
        </button>,
      );
    }

    // Return the final array of components to be rendered,
    // plus the raw typed participants for PiP.
    return {
      pipParticipants,
      participantsToRender,
    };
  }, [
    isRecorder,
    nextPage,
    prePage,
    allParticipants,
    webcamPerPage,
    currentPage,
  ]);

  const structuredLayout = useMemo(() => {
    // This memoized value takes the paginated items (including buttons)
    // and passes them directly to the correct layout helper.
    let layout: ReactElement[];

    const participantsToRender = paginatedParticipants.participantsToRender;

    if (isMobile) {
      layout = getElmsForMobile(
        participantsToRender,
        isPortrait,
        enabledVerticalViewMode,
        isSidebarOpen,
      );
    } else if (isTablet) {
      layout = getElmsForTablet(
        participantsToRender,
        enabledVerticalViewMode,
        isSidebarOpen,
      );
    } else {
      // PC
      if (enabledVerticalViewMode && isEnabledExtendedVerticalCamView) {
        layout = getElmsForPCExtendedVerticalView(participantsToRender);
      } else {
        layout = getElmsForPc(participantsToRender, enabledVerticalViewMode);
      }
    }

    return layout;
  }, [
    paginatedParticipants,
    isMobile,
    isTablet,
    isPortrait,
    enabledVerticalViewMode,
    isSidebarOpen,
    isEnabledExtendedVerticalCamView,
  ]);

  useEffect(() => {
    const isPaginating =
      allParticipants.length > webcamPerPage && currentPage > 1;

    dispatch(setWebcamPaginating(isPaginating));
  }, [allParticipants.length, webcamPerPage, currentPage, dispatch]);

  const allParticipantsCount = useMemo(
    () => allParticipants.length,
    [allParticipants],
  );

  useEffect(() => {
    // This effect manages page number resets.
    // It resets to page 1 if the current page becomes invalid due to changes
    // in participant count or layout (which affects webcamPerPage).
    const totalPages = getTotalWebcamPages(
      allParticipantsCount,
      webcamPerPage,
      isRecorder,
    );

    if (
      currentPage > totalPages ||
      (allParticipantsCount > 0 && currentPage === 0)
    ) {
      setCurrentPage(1);
    }
    // eslint-disable-next-line
  }, [allParticipantsCount, webcamPerPage, isRecorder]);

  if (!totalNumWebcams) {
    return null;
  }

  if (pinParticipant) {
    return (
      <PinnedLayout
        pipParticipants={paginatedParticipants.pipParticipants}
        participantsToRender={structuredLayout}
        pinParticipant={pinParticipant}
        totalNumWebcams={totalNumWebcams}
        currentPage={currentPage}
        isSidebarOpen={isSidebarOpen}
        isEnabledExtendedVerticalCamView={isEnabledExtendedVerticalCamView}
        isDesktop={isDesktop}
      />
    );
  }

  if (enabledVerticalViewMode) {
    return (
      <VerticalLayout
        pipParticipants={paginatedParticipants.pipParticipants}
        participantsToRender={structuredLayout}
        pinParticipant={undefined}
        totalNumWebcams={totalNumWebcams}
        currentPage={currentPage}
        isSidebarOpen={isSidebarOpen}
        isEnabledExtendedVerticalCamView={isEnabledExtendedVerticalCamView}
        isDesktop={isDesktop}
      />
    );
  }

  return (
    <DefaultLayout
      participantsToRender={structuredLayout}
      totalNumWebcams={totalNumWebcams}
      webcamPerPage={webcamPerPage}
      currentPage={currentPage}
    />
  );
};

export default VideoLayout;
