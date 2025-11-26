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
} from './helpers/utils';
import { useDeviceInfo } from './helpers/useDeviceInfo';
import { AngleDown } from '../../../assets/Icons/AngleDown';

interface IVideoLayoutProps {
  allParticipants: ReactElement<VideoParticipantProps>[];
  pinParticipant?: ReactElement<VideoParticipantProps>;
  totalNumWebcams: number;
  isVertical?: boolean;
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
  const isRecorder = store.getState().session.currentUser?.isRecorder;
  const { isMobile, isTablet, isDesktop, isSidebarOpen, isPortrait } =
    useDeviceInfo();

  const [webcamPerPage, setWebcamPerPage] = useState<number>(DESKTOP_PER_PAGE);
  const [currentPage, setCurrentPage] = useState<number>(0);

  useEffect(() => {
    let perPage: number;

    if (isMobile) {
      if (isVertical) {
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
      if (isVertical) {
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
      perPage = DESKTOP_PER_PAGE;
      if (isVertical) {
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
      }
    }
    setWebcamPerPage(perPage);
  }, [
    isEnabledExtendedVerticalCamView,
    isVertical,
    pinParticipant,
    isMobile,
    isTablet,
    isPortrait,
    isSidebarOpen,
  ]);

  const prePage = useCallback((currPage: number) => {
    const newCurrentPage = currPage - 1;
    setCurrentPage(newCurrentPage);
  }, []);

  const nextPage = useCallback((currPage: number) => {
    const newCurrentPage = currPage + 1;
    setCurrentPage(newCurrentPage);
  }, []);

  const paginatedParticipants = useMemo(() => {
    // If we don't have enough participants to require pagination, just return them all.
    if (allParticipants.length <= webcamPerPage) {
      return allParticipants;
    }

    // Start with the max number of items per page. This will be adjusted if we need pagination buttons.
    let itemsToDisplay = webcamPerPage;

    // Determine if a "Previous" button is needed. We don't show pagination for recorders.
    const hasPrevPage = !isRecorder && currentPage > 1;
    if (hasPrevPage) {
      // Decrement the number of items to show, making space for the "Previous" button.
      itemsToDisplay--;
    }

    // Calculate the starting index for the slice.
    // This logic is a bit dense: it accounts for the shifting number of items on each page
    // (e.g., page 1 has one pagination button, middle pages have two, the last page has one).
    const startIndex = hasPrevPage
      ? (currentPage - 1) * itemsToDisplay - (currentPage - 2)
      : 0;

    // Slice the array to find all participants that would come *after* the current page's items.
    const potentialNextItems = allParticipants.slice(
      startIndex + itemsToDisplay,
    );
    // Determine if a "Next" button is needed based on the remaining items.
    const hasNextPage = !isRecorder && potentialNextItems.length > 0;
    if (hasNextPage) {
      // Decrement the number of items to show, making space for the "Next" button.
      itemsToDisplay--;
    }

    // Now that we have the final number of items to display, calculate the end index.
    const endIndex = startIndex + itemsToDisplay;
    // Slice the main array to get the participants for the current page.
    const display = allParticipants.slice(startIndex, endIndex);

    // If a "Next" button is needed, create the button component and add it to the end of our display array.
    if (hasNextPage) {
      display.push(
        <button
          key="next-page"
          role="button"
          className="video-camera-item webcam-next-page order-3 relative bg-Gray-900 text-white cursor-pointer flex items-center justify-between pb-4 pl-4"
          onClick={() => nextPage(currentPage)}
        >
          <div className="left flex-1 flex justify-center">
            {formatNextPreButton(potentialNextItems)}
          </div>
          <div className="right pb-4 -rotate-90">
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
      display.unshift(
        <button
          key="prev-page"
          role="button"
          className="video-camera-item webcam-prev-page order-1 relative bg-Gray-900 text-white cursor-pointer flex items-center justify-between pb-4 pl-4"
          onClick={() => prePage(currentPage)}
        >
          <div className="right rotate-90">
            <AngleDown />
          </div>
          <div className="left flex-1 flex justify-center">
            {formatNextPreButton(prevItems)}
          </div>
        </button>,
      );
    }

    // Return the final array of components to be rendered.
    return display;
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

    if (isMobile) {
      layout = getElmsForMobile(
        paginatedParticipants,
        isPortrait,
        !!isVertical,
        isSidebarOpen,
      );
    } else if (isTablet) {
      layout = getElmsForTablet(
        paginatedParticipants,
        !!isVertical,
        isSidebarOpen,
      );
    } else {
      // PC
      if (isVertical && isEnabledExtendedVerticalCamView) {
        layout = getElmsForPCExtendedVerticalView(paginatedParticipants);
      } else {
        layout = getElmsForPc(paginatedParticipants, !!isVertical);
      }
    }
    return layout;
  }, [
    paginatedParticipants,
    isMobile,
    isTablet,
    isPortrait,
    isVertical,
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
    const totalPages = Math.ceil(allParticipantsCount / webcamPerPage);
    if (
      currentPage > totalPages ||
      (allParticipantsCount > 0 && currentPage === 0)
    ) {
      setCurrentPage(1);
    }
    //eslint-disable-next-line
  }, [allParticipantsCount, webcamPerPage]);

  if (!totalNumWebcams) {
    return null;
  }

  if (isVertical) {
    return (
      <VerticalLayout
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

  if (pinParticipant) {
    return (
      <PinnedLayout
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
