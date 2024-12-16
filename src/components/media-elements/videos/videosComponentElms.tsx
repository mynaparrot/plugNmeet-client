import React, { useEffect, useMemo, useState } from 'react';
// import { useTranslation } from 'react-i18next';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import { setWebcamPaginating } from '../../../store/slices/sessionSlice';
import { UserDeviceType } from '../../../store/slices/interfaces/session';
import {
  getElmsForPc,
  setForMobileAndTablet,
  setForMobileLandscape,
} from './helpers/utils';
import { ColumnCameraPosition } from '../../../store/slices/interfaces/roomSettings';

interface IVideosComponentElmsProps {
  allParticipants: React.JSX.Element[];
  totalNumWebcams: number;
  isVertical?: boolean;
}
export interface VideoParticipantType {
  isAdmin: boolean;
  isLocal: boolean;
}

const MOBILE_PER_PAGE = 6,
  TABLET_PER_PAGE = 9,
  DESKTOP_PER_PAGE = 24,
  VERTICAL_PER_PAGE = 3,
  VERTICAL_TOP_BOTTOM_PER_PAGE = 8,
  VERTICAL_TABLET_PORTRAIT = 5;

const VideosComponentElms = ({
  allParticipants,
  totalNumWebcams,
  isVertical,
}: IVideosComponentElmsProps) => {
  const dispatch = useAppDispatch();
  // const { t } = useTranslation();
  const screenWidth = useAppSelector(
    (state) => state.bottomIconsActivity.screenWidth,
  );
  const deviceOrientation = useAppSelector(
    (state) => state.bottomIconsActivity.deviceOrientation,
  );
  const columnCameraPosition = useAppSelector(
    (state) => state.roomSettings.columnCameraPosition,
  );
  const deviceType = store.getState().session.userDeviceType;

  const [participantsToRender, setParticipantsToRender] = useState<
    Array<React.JSX.Element>
  >([]);
  const [webcamPerPage, setWebcamPerPage] = useState<number>(
    isVertical ? VERTICAL_PER_PAGE : DESKTOP_PER_PAGE,
  );

  const [currentPage, setCurrentPage] = useState<number>(0);
  const [showPre, setShowPre] = useState<boolean>(false);
  const [showNext, setShowNext] = useState<boolean>(false);
  const [isSmallScreen, setIsSmallScreen] = useState<boolean>(false);

  useEffect(() => {
    if (isVertical) {
      if (deviceType === UserDeviceType.DESKTOP && screenWidth > 1024) {
        if (
          columnCameraPosition === ColumnCameraPosition.TOP ||
          columnCameraPosition === ColumnCameraPosition.BOTTOM
        ) {
          setWebcamPerPage(VERTICAL_TOP_BOTTOM_PER_PAGE);
          return;
        }
      } else if (
        deviceType === UserDeviceType.TABLET &&
        deviceOrientation === 'portrait'
      ) {
        setWebcamPerPage(VERTICAL_TABLET_PORTRAIT);
        return;
      }
      setWebcamPerPage(VERTICAL_PER_PAGE);
      return;
    }
    if (!screenWidth) {
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
  }, [isVertical, screenWidth, columnCameraPosition, deviceOrientation]);

  const renderParticipantsByPage = (
    allParticipants: Array<React.JSX.Element>,
    page_number: number,
    per_page: number,
  ) => {
    let hasNextPage: boolean,
      hasPrevPage = false;
    // so we got pagination
    if (page_number === 1) {
      // then only have next
      // so, we'll deduct per page by 1
      // and insert pagination in that slot
      per_page--;
      hasNextPage = true;
    } else {
      hasPrevPage = true;
      per_page--;
      // so, we're in next page
      if (page_number >= totalNumWebcams / per_page) {
        hasNextPage = false;
      } else {
        per_page--;
        hasNextPage = true;
      }
    }

    const display = allParticipants.slice(
      (page_number - 1) * per_page,
      page_number * per_page,
    );

    if (hasNextPage) {
      display.push(
        <button type="button" onClick={() => nextPage(page_number)}>
          {formatNextPreButton(allParticipants.slice(display.length))}
        </button>,
      );
    }
    if (hasPrevPage) {
      display.splice(
        0,
        0,
        <button type="button" onClick={() => prePage(page_number)}>
          {formatNextPreButton(allParticipants.slice(display.length))}
        </button>,
      );
    }

    setParticipantsToRender(display);
    if (page_number === 1) {
      dispatch(setWebcamPaginating(false));
    } else {
      dispatch(setWebcamPaginating(true));
    }
  };

  const formatNextPreButton = (remaining: React.JSX.Element[]) => {
    const text: React.JSX.Element[] = [<span>More: {remaining.length}</span>];
    for (let i = 0; i < remaining.length; i++) {
      if (i === 2 && remaining.length > i) {
        // so,we have more
        text.push(<span>and {remaining.length - i} others </span>);
        break;
      }
      const data = remaining[i];
      text.push(<span>{data.props.participant.name}</span>);
    }
    return <div>{text}</div>;
  };

  useEffect(() => {
    if (allParticipants.length <= webcamPerPage) {
      // we don't need any pagination
      setParticipantsToRender(allParticipants);
    } else {
      setCurrentPage(1);
      renderParticipantsByPage(allParticipants, 1, webcamPerPage);
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

  const prePage = (currPage: number) => {
    const newCurrentPage = currPage - 1;
    renderParticipantsByPage(allParticipants, newCurrentPage, webcamPerPage);
    setCurrentPage(newCurrentPage);
  };

  const nextPage = (currPage: number) => {
    const newCurrentPage = currPage + 1;
    renderParticipantsByPage(allParticipants, newCurrentPage, webcamPerPage);
    setCurrentPage(newCurrentPage);
  };

  const videoParticipantsElms = useMemo(() => {
    if (isVertical) {
      return participantsToRender;
    }
    let elms: Array<React.JSX.Element>;

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
      elms = getElmsForPc(participantsToRender);
    }

    return elms;
    //eslint-disable-next-line
  }, [isVertical, participantsToRender, deviceOrientation]);

  const render = () => {
    return (
      <>
        {showPre ? (
          <button
            type="button"
            className="previous-cam"
            onClick={() => prePage(currentPage)}
          >
            <i className="pnm-arrow-up" />
          </button>
        ) : null}

        {/*all webcams*/}
        <>{videoParticipantsElms}</>

        {showNext ? (
          <button
            type="button"
            className="next-cam"
            onClick={() => nextPage(currentPage)}
          >
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
      {/* {deviceType === UserDeviceType.DESKTOP &&
      totalNumWebcams > 6 &&
      !isVertical ? (
        <div className="select-camera-number">
          <select
            name="select-camera-num"
            id="select-camera-num"
            defaultValue="24"
            onChange={(e) => setWebcamPerPage(Number(e.currentTarget.value))}
          >
            <option value="6">6</option>
            <option value="8">8</option>
            <option value="12">12</option>
            <option value="15">15</option>
            <option value="18">18</option>
            <option value="24">24</option>
          </select>
          <label htmlFor="select-camera-num">{t('app.webcams-per-page')}</label>
        </div>
      ) : null} */}
    </>
  );
};

export default VideosComponentElms;
