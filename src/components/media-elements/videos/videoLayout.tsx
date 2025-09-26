import React, { ReactElement, useEffect, useMemo, useState } from 'react';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import { setWebcamPaginating } from '../../../store/slices/sessionSlice';
import { VideoParticipantProps } from './videoParticipant';
import PinnedLayout from './layouts/pinnedLayout';
import VerticalLayout from './layouts/verticalLayout';
import DefaultLayout from './layouts/defaultLayout';

interface IVideoLayoutProps {
  allParticipants: ReactElement<VideoParticipantProps>[];
  pinParticipant?: ReactElement<VideoParticipantProps>;
  totalNumWebcams: number;
  isVertical?: boolean;
}

const DESKTOP_PER_PAGE = 24,
  VERTICAL_PER_PAGE = 5,
  EXTENDED_VERTICAL_PER_PAGE = 10;

const sliceFirstLetterOfText = (name: any) =>
  name
    .split(/\s+/)
    .map((word: string[]) => word[0].toUpperCase())
    .join('');

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
  const isWebcamPaginating = useAppSelector(
    (state) => state.session.isWebcamPaginating,
  );
  const isRecorder = store.getState().session.currentUser?.isRecorder;

  const [participantsToRender, setParticipantsToRender] = useState<
    Array<ReactElement>
  >([]);
  const [webcamPerPage, setWebcamPerPage] = useState<number>(DESKTOP_PER_PAGE);
  const [currentPage, setCurrentPage] = useState<number>(0);

  useEffect(() => {
    let perPage = DESKTOP_PER_PAGE;
    if (isVertical) {
      perPage = isEnabledExtendedVerticalCamView
        ? EXTENDED_VERTICAL_PER_PAGE
        : VERTICAL_PER_PAGE;
      if (pinParticipant) {
        // if vertical view has pin, we will lose space.
        perPage -= isEnabledExtendedVerticalCamView ? 2 : 1;
      }
    } else if (pinParticipant) {
      // if we have a pinned participant, the rest will be in a vertical view
      perPage = isEnabledExtendedVerticalCamView
        ? EXTENDED_VERTICAL_PER_PAGE
        : VERTICAL_PER_PAGE;
    }
    setWebcamPerPage(perPage);
  }, [isEnabledExtendedVerticalCamView, isVertical, pinParticipant]);

  const formatNextPreButton = (
    remaining: ReactElement<VideoParticipantProps>[],
  ) => {
    const MAX_AVATARS_TO_SHOW = 2;
    const participantsToShow = remaining.slice(0, MAX_AVATARS_TO_SHOW);
    const remainingCount = remaining.length - participantsToShow.length;

    const shortNameElms = participantsToShow.map((p) => (
      <span
        key={`${p.key}-short`}
        className="inline-flex items-center justify-center order-1 pr-1 bg-[#003C59] rounded-[13px] border-2 border-Gray-900 w-10 h-10 -ml-2 overflow-hidden"
      >
        {sliceFirstLetterOfText(p.props.participant.name)}
      </span>
    ));

    const fullNameElms = participantsToShow.map((p) => (
      <span
        key={`${p.key}-full`}
        className="inline-block order-1 pr-1 capitalize"
      >
        {p.props.participant.name},{' '}
      </span>
    ));

    if (remainingCount > 0) {
      shortNameElms.push(
        <span
          key="more-users-short"
          className="inline-flex items-center justify-center order-2 pr-1 bg-[rgba(0,102,153,1)] rounded-[13px] border-2 border-Gray-900 w-10 h-10 -ml-2 overflow-hidden"
        >
          {remainingCount}+
        </span>,
      );
      fullNameElms.push(
        <span key="more-users-full" className="inline-block order-2">
          and {remainingCount}+ others
        </span>,
      );
    }

    return (
      <>
        <div className="middle-area absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex text-base font-medium">
          {shortNameElms}
        </div>
        <div className="bottom-area flex flex-wrap text-sm font-medium">
          {fullNameElms}
        </div>
      </>
    );
  };

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
          className="video-camera-item webcam-next-page order-3 relative bg-Gray-900 text-white cursor-pointer flex items-end pb-4 pl-4"
          onClick={() => nextPage(currentPage)}
        >
          {formatNextPreButton(potentialNextItems)}
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
          className="video-camera-item webcam-prev-page order-1 relative bg-Gray-900 text-white cursor-pointer flex items-end pb-4 pl-4"
          onClick={() => prePage(currentPage)}
        >
          {formatNextPreButton(prevItems)}
        </button>,
      );
    }

    // Return the final array of components to be rendered.
    return display;
  }, [allParticipants, webcamPerPage, currentPage, isRecorder]);

  const allParticipantsCount = useMemo(
    () => allParticipants.length,
    [allParticipants],
  );

  useEffect(() => {
    // This effect manages the current page number.
    // It resets to page 1 if the layout changes (and we're not paginating),
    // or initializes the page to 1 if it's currently 0, and we have participants.
    if (
      (!isWebcamPaginating && currentPage !== 1) ||
      (allParticipantsCount > 0 && currentPage === 0)
    ) {
      setCurrentPage(1);
    }
  }, [allParticipantsCount, webcamPerPage, isWebcamPaginating, currentPage]);

  useEffect(() => {
    // This effect handles the side-effects of pagination
    setParticipantsToRender(paginatedParticipants);
    const isPaginating =
      allParticipantsCount > webcamPerPage && currentPage > 1;
    dispatch(setWebcamPaginating(isPaginating));
  }, [
    paginatedParticipants,
    allParticipantsCount,
    webcamPerPage,
    currentPage,
    dispatch,
  ]);

  const prePage = (currPage: number) => {
    const newCurrentPage = currPage - 1;
    setCurrentPage(newCurrentPage);
  };

  const nextPage = (currPage: number) => {
    const newCurrentPage = currPage + 1;
    setCurrentPage(newCurrentPage);
  };

  if (!totalNumWebcams) {
    return null;
  }

  if (isVertical) {
    return (
      <VerticalLayout
        participantsToRender={participantsToRender}
        pinParticipant={pinParticipant}
        totalNumWebcams={totalNumWebcams}
        currentPage={currentPage}
      />
    );
  }

  if (pinParticipant) {
    return (
      <PinnedLayout
        participantsToRender={participantsToRender}
        pinParticipant={pinParticipant}
        totalNumWebcams={totalNumWebcams}
        currentPage={currentPage}
      />
    );
  }

  return (
    <DefaultLayout
      participantsToRender={participantsToRender}
      totalNumWebcams={totalNumWebcams}
      webcamPerPage={webcamPerPage}
      currentPage={currentPage}
    />
  );
};

export default VideoLayout;
