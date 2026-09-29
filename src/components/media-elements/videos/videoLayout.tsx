import React, { ReactElement, useCallback, useEffect, useMemo, useState } from 'react';

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
  getElmsForTabletPortrait,
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

// Desktop / PC
const DESKTOP_PER_PAGE = 24,
  PC_VERTICAL_PER_PAGE = 5,
  PC_EXTENDED_VERTICAL_PER_PAGE = 10,
  // Tablet
  TABLET_PER_PAGE = 9,
  TABLET_WITH_SIDEBAR_PER_PAGE = 6,
  TABLET_PORTRAIT_PER_PAGE = 9,
  TABLET_PORTRAIT_WITH_SIDEBAR_PER_PAGE = 6,
  TABLET_VERTICAL_LANDSCAPE_PER_PAGE = 6,
  TABLET_VERTICAL_PORTRAIT_PER_PAGE = 4,
  TABLET_VERTICAL_PORTRAIT_WITH_SIDEBAR_PER_PAGE = 2,
  // Mobile
  MOBILE_PER_PAGE = 6,
  MOBILE_WITH_SIDEBAR_PER_PAGE = 4,
  MOBILE_VERTICAL_LANDSCAPE_PER_PAGE = 3,
  MOBILE_VERTICAL_WITH_SIDEBAR_PER_PAGE = 3,
  MOBILE_VERTICAL_PORTRAIT_PER_PAGE = 3;

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
  const maxNumDisplayWebcams = useAppSelector((state) => state.roomSettings.maxNumDisplayWebcams);

  const isRecorder = store.getState().session.currentUser?.isRecorder;
  const { isMobile, isTablet, isDesktop, isSidebarOpen, isPortrait } = useDeviceInfo();

  const [webcamPerPage, setWebcamPerPage] = useState<number>(DESKTOP_PER_PAGE);
  const [currentPage, setCurrentPage] = useState<number>(0);

  // The pin renders in the strip on page 1 only — it consumes strip
  // slots there (1 normal, 2 extended), never on pages 2+.
  const pinInStrip = !!pinParticipant && !!isVertical;
  const pinStripSlots = pinInStrip ? (isEnabledExtendedVerticalCamView ? 2 : 1) : 0;

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
    const effectiveUserLimit = deviceMax && deviceMax > 0 ? deviceMax : DESKTOP_PER_PAGE;

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
        perPage = isSidebarOpen ? MOBILE_WITH_SIDEBAR_PER_PAGE : MOBILE_PER_PAGE;
      }
    } else if (isTablet) {
      if (enabledVerticalViewMode) {
        // Vertical view: right strip (landscape) or bottom bar (portrait)
        perPage = isPortrait
          ? isSidebarOpen
            ? TABLET_VERTICAL_PORTRAIT_WITH_SIDEBAR_PER_PAGE
            : TABLET_VERTICAL_PORTRAIT_PER_PAGE
          : TABLET_VERTICAL_LANDSCAPE_PER_PAGE;
      } else {
        // default mode
        if (isPortrait) {
          perPage = isSidebarOpen
            ? TABLET_PORTRAIT_WITH_SIDEBAR_PER_PAGE
            : TABLET_PORTRAIT_PER_PAGE;
        } else {
          perPage = isSidebarOpen ? TABLET_WITH_SIDEBAR_PER_PAGE : TABLET_PER_PAGE;
        }
      }
    } else {
      // PC
      if (enabledVerticalViewMode) {
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
    isMobile,
    isTablet,
    isPortrait,
    isSidebarOpen,
    maxNumDisplayWebcams,
  ]);

  useEffect(() => {
    const hasPages = allParticipants.length > webcamPerPage - pinStripSlots;
    dispatch(updateHasWebcamPages(hasPages));
  }, [allParticipants.length, webcamPerPage, pinStripSlots, dispatch]);

  const prePage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  }, []);

  const nextPage = useCallback(() => {
    setCurrentPage((prev) => prev + 1);
  }, []);

  const paginatedParticipants = useMemo<IPaginatedParticipantsResult>(() => {
    // If we don't have enough participants to require pagination, just return them all.
    if (allParticipants.length <= webcamPerPage - pinStripSlots) {
      return {
        pipParticipants: allParticipants,
        participantsToRender: [...allParticipants],
      };
    }

    // We don't show pagination for recorders.
    // Keep the recorder view limited to the first page worth of participants.
    if (isRecorder) {
      const pipParticipants = allParticipants.slice(0, webcamPerPage - pinStripSlots);

      return {
        pipParticipants,
        participantsToRender: [...pipParticipants],
      };
    }

    const safeCurrentPage = Math.max(currentPage, 1);

    // Determine if a "Previous" button is needed.
    const hasPrevPage = safeCurrentPage > 1;

    // Slot accounting: page 1 reserves the "Next" button slot plus the pin
    // cam slots (pin renders on page 1 only); middle pages reserve both
    // button slots; the last page only the "Previous" one.
    const firstPageParticipantCapacity = webcamPerPage - 1 - pinStripSlots;
    const middlePageParticipantCapacity = webcamPerPage - 2;

    const startIndex = hasPrevPage
      ? firstPageParticipantCapacity + (safeCurrentPage - 2) * middlePageParticipantCapacity
      : 0;

    // Start with the max number of items per page. This will be adjusted if we need pagination buttons.
    let itemsToDisplay = webcamPerPage;

    if (!hasPrevPage && pinInStrip) {
      // Page 1: the pin cam consumes its strip slots here.
      itemsToDisplay -= pinStripSlots;
    }

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
          className="video-camera-item webcam-next-page order-3 relative bg-Gray-900 text-white cursor-pointer flex items-center justify-between"
          title={potentialNextItems.map((p) => p.props.participant.name).join(', ')}
          onClick={nextPage}
        >
          <div className="left flex-1 flex justify-center items-center absolute top-0 start-0 w-full h-full">
            {formatNextPreButton(potentialNextItems)}
          </div>
          <div className="right ltr:-rotate-90 rtl:rotate-90 absolute top-1/2 -translate-y-1/2 end-3">
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
          className="video-camera-item webcam-prev-page order-1 relative bg-Gray-900 text-white cursor-pointer flex items-center justify-between"
          title={prevItems.map((p) => p.props.participant.name).join(', ')}
          onClick={prePage}
        >
          <div className="right ltr:rotate-90 rtl:-rotate-90 absolute top-1/2 -translate-y-1/2 start-3">
            <AngleDown />
          </div>
          <div className="left flex-1 flex justify-center items-center absolute top-0 start-0 w-full h-full">
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
    pinInStrip,
    pinStripSlots,
  ]);

  const structuredLayout = useMemo(() => {
    // This memoized value takes the paginated items (including buttons)
    // and passes them directly to the correct layout helper.
    let layout: ReactElement[];

    const participantsToRender = paginatedParticipants.participantsToRender;

    // Non-extended: the pin becomes a regular first tile of the list (page 1 only).
    const prependPinToList = pinInStrip && currentPage <= 1 && !isEnabledExtendedVerticalCamView;
    const items = prependPinToList
      ? [pinParticipant, ...participantsToRender]
      : participantsToRender;

    // Mobile always uses the mobile layout helper.
    if (isMobile) {
      layout = getElmsForMobile(items, isPortrait, enabledVerticalViewMode, isSidebarOpen);
    } else if (isTablet && isPortrait) {
      layout = getElmsForTabletPortrait(items, isSidebarOpen, enabledVerticalViewMode);
    } else if (isTablet) {
      layout = getElmsForTablet(items, enabledVerticalViewMode, isSidebarOpen);
    } else {
      // PC
      if (enabledVerticalViewMode && isEnabledExtendedVerticalCamView) {
        // Extended: the pin renders via the pinCam-item wrapper in VerticalLayout.
        layout = getElmsForPCExtendedVerticalView(participantsToRender);
      } else {
        layout = getElmsForPc(items, enabledVerticalViewMode);
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
    pinParticipant,
    pinInStrip,
    currentPage,
  ]);

  useEffect(() => {
    const isPaginating = allParticipants.length > webcamPerPage - pinStripSlots && currentPage > 1;

    dispatch(setWebcamPaginating(isPaginating));
  }, [allParticipants.length, webcamPerPage, pinStripSlots, currentPage, dispatch]);

  const allParticipantsCount = useMemo(() => allParticipants.length, [allParticipants]);

  useEffect(() => {
    // This effect manages page number resets.
    // It resets to page 1 if the current page becomes invalid due to changes
    // in participant count or layout (which affects webcamPerPage).
    const totalPages = getTotalWebcamPages(
      allParticipantsCount,
      webcamPerPage,
      isRecorder,
      pinStripSlots,
    );

    if (currentPage > totalPages || (allParticipantsCount > 0 && currentPage === 0)) {
      setCurrentPage(1);
    }
    // eslint-disable-next-line
  }, [allParticipantsCount, webcamPerPage, isRecorder, pinStripSlots]);

  if (!totalNumWebcams) {
    return null;
  }

  if (pinParticipant && !isVertical) {
    // Pin cam takes the middle area only when no content
    // (screen share / whiteboard / external media / link) is active.
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

  if (isVertical) {
    // Content takes priority for the middle area; a pinned cam (if any)
    // moves into the vertical strip on top.
    return (
      <VerticalLayout
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
