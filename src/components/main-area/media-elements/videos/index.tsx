import React, { useEffect, useMemo, useState } from 'react';
import { LocalParticipant, RemoteParticipant } from 'livekit-client';
import { useTranslation } from 'react-i18next';
import { chunk } from 'lodash';
import { createSelector } from '@reduxjs/toolkit';

import { RootState, useAppDispatch, useAppSelector } from '../../../../store';
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

const screenWidthSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity.screenWidth,
  (screenWidth) => screenWidth,
);

const VideoElements = ({
  videoSubscribers,
  perPage,
  isVertical,
}: IVideoElementsProps) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { allParticipants, totalNumWebcams } =
    useVideoParticipant(videoSubscribers);
  const screenWidth = useAppSelector(screenWidthSelector);

  const [currentPage, setCurrentPage] = useState<number>(0);
  const [participantsToRender, setParticipantsToRender] = useState<
    Array<JSX.Element>
  >([]);
  const [showPre, setShowPre] = useState<boolean>(false);
  const [showNext, setShowNext] = useState<boolean>(false);
  const [webcamPerPage, setWebcamPerPage] = useState<number>(perPage ?? 24);
  const [isSmallDevice, setIsSmallDevice] = useState<boolean>(false);

  const setParticipantsToDisplay = (
    [...allParticipants]: Array<JSX.Element>,
    page_number: number,
    per_page: number,
  ) => {
    const display = allParticipants.slice(
      (page_number - 1) * per_page,
      page_number * per_page,
    );

    setParticipantsToRender(display);
    if (page_number === 1) {
      dispatch(setWebcamPaginating(false));
    } else {
      dispatch(setWebcamPaginating(true));
    }
  };

  useMemo(() => {
    if (allParticipants.length <= webcamPerPage) {
      // we don't need any pagination
      setParticipantsToRender(allParticipants);
    } else {
      setCurrentPage(1);
      setParticipantsToDisplay(allParticipants, 1, webcamPerPage);
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

  useEffect(() => {
    if (!screenWidth || isVertical) {
      return;
    }
    if (screenWidth >= 0 && screenWidth <= 640) {
      setWebcamPerPage(6);
      setIsSmallDevice(true);
    } else if (screenWidth >= 641 && screenWidth <= 1025) {
      setWebcamPerPage(8);
      setIsSmallDevice(true);
    } else {
      setWebcamPerPage(24);
      setIsSmallDevice(false);
    }
  }, [screenWidth, isVertical]);

  const prePage = () => {
    setParticipantsToDisplay(allParticipants, currentPage - 1, webcamPerPage);
    setCurrentPage(currentPage - 1);
  };

  const nextPage = () => {
    setParticipantsToDisplay(allParticipants, currentPage + 1, webcamPerPage);
    setCurrentPage(currentPage + 1);
  };

  const videoParticipantsElms = useMemo(() => {
    if (isVertical) {
      return participantsToRender;
    }
    if (isSmallDevice) {
      return participantsToRender;
    } else {
      const elms: Array<JSX.Element> = [];
      const length = participantsToRender.length;
      if (length < 4) {
        elms.push(
          <div className={`camera-row-0 items-${length}`}>
            {participantsToRender}
          </div>,
        );
      } else if (length >= 4 && length <= 10) {
        const c = chunk(participantsToRender, Math.ceil(length / 2));
        c.forEach((el, i) => {
          elms.push(
            <div
              className={`camera-row-${i} items-${el.length} items-${length}`}
            >
              {el}
            </div>,
          );
        });
      } else {
        const c = chunk(participantsToRender, Math.ceil(length / 3));
        c.forEach((el, i) => {
          elms.push(
            <div
              className={`camera-row-${i} items-${el.length} items-${length}`}
            >
              {el}
            </div>,
          );
        });
      }
      return elms;
    }
  }, [participantsToRender, isVertical, isSmallDevice]);

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
        <>{videoParticipantsElms}</>

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
          className={`all-webcam-wrapper total-cam-${totalNumWebcams} selected-cam-${webcamPerPage} page-${currentPage} ${
            isVertical ? 'vertical-webcams' : ''
          }`}
        >
          <div className="all-webcam-wrapper-inner">{render()}</div>
        </div>
      ) : null}
      {totalNumWebcams > 6 && !isVertical && !isSmallDevice ? (
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
