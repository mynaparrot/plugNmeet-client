import React, { useEffect, useState } from 'react';
import { LocalParticipant, RemoteParticipant } from 'livekit-client';

import { useAppDispatch } from '../../../../store';
import { setWebcamPaginating } from '../../../../store/slices/sessionSlice';
import useVideoParticipant from './useVideoParticipant';

interface IVideoElementsProps {
  videoSubscribers: Map<string, LocalParticipant | RemoteParticipant>;
  perPage?: number;
  isVertical?: boolean;
}
export interface VideoParticipantType {
  isAdmin: boolean;
  isLocal: boolean;
}

const VideoElements = ({
  videoSubscribers,
  perPage,
  isVertical,
}: IVideoElementsProps) => {
  const DEFAULT_PER_PAGE = perPage ?? 25;
  const dispatch = useAppDispatch();

  const { allParticipants, totalNumWebcams } =
    useVideoParticipant(videoSubscribers);

  const [currentPage, setCurrentPage] = useState<number>(0);
  const [displayParticipants, setDisplayParticipants] = useState<
    Array<JSX.Element>
  >([]);
  const [showPre, setShowPre] = useState<boolean>(false);
  const [showNext, setShowNext] = useState<boolean>(false);

  useEffect(() => {
    if (allParticipants.length <= DEFAULT_PER_PAGE) {
      // we don't need any pagination
      setDisplayParticipants(allParticipants);
    } else {
      setCurrentPage(1);
      setParticipantToDisplay(allParticipants, 1, DEFAULT_PER_PAGE);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allParticipants]);

  useEffect(() => {
    if (totalNumWebcams > DEFAULT_PER_PAGE) {
      if (currentPage === 1) {
        setShowPre(false);
      } else {
        setShowPre(true);
      }

      if (currentPage >= totalNumWebcams / DEFAULT_PER_PAGE) {
        setShowNext(false);
      } else {
        setShowNext(true);
      }
    } else {
      setShowPre(false);
      setShowNext(false);
    }
  }, [totalNumWebcams, currentPage, DEFAULT_PER_PAGE]);

  const setParticipantToDisplay = (
    [...allParticipants]: Array<JSX.Element>,
    page_number: number,
    per_page: number,
  ) => {
    const display = allParticipants.slice(
      (page_number - 1) * per_page,
      page_number * per_page,
    );

    setDisplayParticipants(display);
    if (page_number === 1) {
      dispatch(setWebcamPaginating(false));
    } else {
      dispatch(setWebcamPaginating(true));
    }
  };

  const prePage = () => {
    setParticipantToDisplay(allParticipants, currentPage - 1, DEFAULT_PER_PAGE);
    setCurrentPage(currentPage - 1);
  };

  const nextPage = () => {
    setParticipantToDisplay(allParticipants, currentPage + 1, DEFAULT_PER_PAGE);
    setCurrentPage(currentPage + 1);
  };

  const render = () => {
    return (
      <>
        {showPre ? (
          <button
            type="button"
            className="previous-cam"
            onClick={() => prePage()}
          >
            <i className="pnm-arrow-up" />
          </button>
        ) : null}

        {/*all webcams*/}
        <>{displayParticipants}</>

        {showNext ? (
          <button type="button" className="next-cam" onClick={() => nextPage()}>
            <i className="pnm-arrow-down" />
          </button>
        ) : null}
      </>
    );
  };

  return (
    <>
      {totalNumWebcams > 0 ? (
        <div
          className={`all-webcam-wrapper total-cam-${totalNumWebcams} page-${currentPage} ${
            isVertical ? 'vertical-webcams' : ''
          }`}
        >
          <div className="all-webcam-wrapper-inner">{render()}</div>
        </div>
      ) : null}
    </>
  );
};

export default React.memo(VideoElements);
