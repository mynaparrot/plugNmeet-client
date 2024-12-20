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
import { ArrowRight } from '../../../assets/Icons/ArrowRight';

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
      if (!isVertical) {
        per_page--;
      }
      hasNextPage = true;
    } else {
      hasPrevPage = true;
      if (!isVertical) {
        per_page--;
      }
      // so, we're in next page
      if (page_number >= totalNumWebcams / per_page) {
        hasNextPage = false;
      } else {
        if (!isVertical) {
          per_page--;
        }
        hasNextPage = true;
      }
    }

    const display = allParticipants.slice(
      (page_number - 1) * per_page,
      page_number * per_page,
    );

    if (hasNextPage) {
      display.push(
        <div
          className="video-camera-item webcam-next-page order-3 relative bg-Gray-900 text-white cursor-pointer flex items-end pb-4 pl-4"
          onClick={() => nextPage(page_number)}
        >
          {formatNextPreButton(allParticipants.slice(page_number * per_page))}
        </div>,
      );
    }
    if (hasPrevPage) {
      display.splice(
        0,
        0,
        <div
          className="video-camera-item webcam-prev-page order-1 relative bg-Gray-900 text-white cursor-pointer flex items-end pb-4 pl-4"
          onClick={() => prePage(page_number)}
        >
          {formatNextPreButton(
            allParticipants.slice(-(page_number - 1) * per_page),
          )}
        </div>,
      );
    }

    setParticipantsToRender(display);
    if (page_number === 1) {
      dispatch(setWebcamPaginating(false));
    } else {
      dispatch(setWebcamPaginating(true));
    }
  };
  const sliceFirstLetterOfText = (name: any) =>
    name
      .split(/\s+/) // Split the name by spaces
      .map((word) => word[0].toUpperCase()) // Get the first letter of each word in uppercase
      .join(''); // Join the initials into a string

  const formatNextPreButton = (remaining: React.JSX.Element[]) => {
    const shortName: React.JSX.Element[] = [];
    const fullName: React.JSX.Element[] = [];
    for (let i = 0; i < remaining.length; i++) {
      if (i === 2 && remaining.length > i) {
        // so,we have more
        shortName.push(
          <span className="inline-flex items-center justify-center order-2 pr-1 bg-[rgba(0,102,153,1)] rounded-[13px] border-2 border-Gray-900 w-10 h-10 -ml-2">
            {remaining.length - i}+
          </span>,
        );
        fullName.push(
          <span className="inline-block order-2">
            and {remaining.length - i}+ others
          </span>,
        );
        break;
      }
      const data = remaining[i];
      shortName.push(
        <span className="inline-flex items-center justify-center order-1 pr-1 bg-[#003C59] rounded-[13px] border-2 border-Gray-900 w-10 h-10 -ml-2">
          {sliceFirstLetterOfText(data.props.participant.name)}
        </span>,
      );
      fullName.push(
        <span className="inline-block order-1 pr-1 capitalize">
          {data.props.participant.name},{' '}
        </span>,
      );
    }
    return (
      <>
        <div className="middle-area absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex text-base font-medium">
          {shortName}
        </div>
        <div className="bottom-area flex flex-wrap text-sm font-medium">
          {fullName}
        </div>
        <div className="icon absolute top-1/2 right-5 -translate-y-1/2 w-4 h-4 flex items-start justify-end">
          <ArrowRight />
        </div>
      </>
    );
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
            className="previous-cam hidden"
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
            className="next-cam hidden"
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
