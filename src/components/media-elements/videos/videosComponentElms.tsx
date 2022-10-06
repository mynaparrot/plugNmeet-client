import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createSelector } from '@reduxjs/toolkit';

import {
  RootState,
  store,
  useAppDispatch,
  useAppSelector,
} from '../../../store';
import { setWebcamPaginating } from '../../../store/slices/sessionSlice';
import { UserDeviceType } from '../../../store/slices/interfaces/session';
import {
  setForMobileAndTablet,
  setForMobileLandscape,
  setForPC,
} from './helpers/utils';

interface IVideosComponentElmsProps {
  allParticipants: JSX.Element[];
  totalNumWebcams: number;
  perPage?: number;
  isVertical?: boolean;
}
export interface VideoParticipantType {
  isAdmin: boolean;
  isLocal: boolean;
}

const MOBILE_PER_PAGE = 6,
  TABLET_PER_PAGE = 9,
  DESKTOP_PER_PAGE = 24;

const screenWidthSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity.screenWidth,
  (screenWidth) => screenWidth,
);
const deviceOrientationSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity.deviceOrientation,
  (deviceOrientation) => deviceOrientation,
);

const VideosComponentElms = ({
  allParticipants,
  totalNumWebcams,
  perPage,
  isVertical,
}: IVideosComponentElmsProps) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const screenWidth = useAppSelector(screenWidthSelector);
  const deviceOrientation = useAppSelector(deviceOrientationSelector);
  const deviceType = store.getState().session.userDeviceType;

  const [participantsToRender, setParticipantsToRender] = useState<
    Array<JSX.Element>
  >([]);
  const [webcamPerPage, setWebcamPerPage] = useState<number>(
    perPage ?? DESKTOP_PER_PAGE,
  );

  const [currentPage, setCurrentPage] = useState<number>(0);
  const [showPre, setShowPre] = useState<boolean>(false);
  const [showNext, setShowNext] = useState<boolean>(false);
  const [isSmallScreen, setIsSmallScreen] = useState<boolean>(false);

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

  useEffect(() => {
    if (allParticipants.length <= webcamPerPage) {
      // we don't need any pagination
      setParticipantsToRender(allParticipants);
    } else {
      setCurrentPage(1);
      setParticipantsToDisplay(allParticipants, 1, webcamPerPage);
    }
    // eslint-disable-next-line
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

  useMemo(() => {
    if (!screenWidth || isVertical) {
      return;
    }
    if (screenWidth <= 640) {
      setWebcamPerPage(MOBILE_PER_PAGE);
      setIsSmallScreen(true);
    } else if (screenWidth > 640 && screenWidth <= 1024) {
      if (deviceType === UserDeviceType.MOBILE) {
        setWebcamPerPage(MOBILE_PER_PAGE);
      } else {
        setWebcamPerPage(TABLET_PER_PAGE);
      }
      setIsSmallScreen(true);
    } else {
      if (deviceType === UserDeviceType.TABLET) {
        setWebcamPerPage(TABLET_PER_PAGE);
        setIsSmallScreen(true);
      } else {
        setWebcamPerPage(DESKTOP_PER_PAGE);
        setIsSmallScreen(false);
      }
    }
    //eslint-disable-next-line
  }, [screenWidth]);

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
    let elms: Array<JSX.Element>;

    if (
      deviceType === UserDeviceType.MOBILE &&
      deviceOrientation === 'landscape'
    ) {
      elms = setForMobileLandscape(participantsToRender);
    } else if (
      deviceType === UserDeviceType.MOBILE ||
      deviceType === UserDeviceType.TABLET ||
      isSmallScreen
    ) {
      // for mobile & tablet
      // at present we can use same logic for small screen of desktop
      elms = setForMobileAndTablet(participantsToRender);
    } else {
      // for PC
      elms = setForPC(participantsToRender);
    }

    return elms;
    //eslint-disable-next-line
  }, [participantsToRender, deviceOrientation]);

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
      {deviceType === UserDeviceType.DESKTOP &&
      totalNumWebcams > 6 &&
      !isVertical ? (
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

export default VideosComponentElms;
