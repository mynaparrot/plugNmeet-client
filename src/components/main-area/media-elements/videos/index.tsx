import React, { useEffect, useState } from 'react';
import { LocalParticipant, RemoteParticipant } from 'livekit-client';
import { useTranslation } from 'react-i18next';

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
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { allParticipants, totalNumWebcams } =
    useVideoParticipant(videoSubscribers);

  const [currentPage, setCurrentPage] = useState<number>(0);
  const [displayParticipants, setDisplayParticipants] = useState<
    Array<JSX.Element>
  >([]);
  const [showPre, setShowPre] = useState<boolean>(false);
  const [showNext, setShowNext] = useState<boolean>(false);
  const [webcamPerPage, setWebcamPerPage] = useState<number>(perPage ?? 24);

  useEffect(() => {
    if (allParticipants.length <= webcamPerPage) {
      // we don't need any pagination
      setDisplayParticipants(allParticipants);
    } else {
      setCurrentPage(1);
      setParticipantToDisplay(allParticipants, 1, webcamPerPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allParticipants, webcamPerPage]);

  useEffect(() => {
    if (totalNumWebcams > webcamPerPage) {
      if (currentPage === 1) {
        setShowPre(false);
      } else {
        setShowPre(true);
      }

      if (currentPage >= totalNumWebcams / webcamPerPage) {
        setShowNext(false);
      } else {
        setShowNext(true);
      }
    } else {
      setShowPre(false);
      setShowNext(false);
    }
  }, [totalNumWebcams, currentPage, webcamPerPage]);

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
    setParticipantToDisplay(allParticipants, currentPage - 1, webcamPerPage);
    setCurrentPage(currentPage - 1);
  };

  const nextPage = () => {
    setParticipantToDisplay(allParticipants, currentPage + 1, webcamPerPage);
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
      {totalNumWebcams > 6 && !isVertical ? (
        <div className="select-camera-number">
          <label htmlFor="select-camera-num">{t('app.webcams-per-page')}</label>
          <select
            name="select-camera-num"
            id="select-camera-num"
            onChange={(e) => setWebcamPerPage(Number(e.currentTarget.value))}
          >
            <option value="6">6</option>
            <option value="8">8</option>
            <option value="12">12</option>
            <option value="15">15</option>
            <option value="18">18</option>
            <option selected>24</option>
          </select>
        </div>
      ) : null}
    </>
  );
};

export default React.memo(VideoElements);
