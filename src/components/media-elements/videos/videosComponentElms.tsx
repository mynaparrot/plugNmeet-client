import React, { useEffect, useMemo, useState } from 'react';
// import { useTranslation } from 'react-i18next';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import { setWebcamPaginating } from '../../../store/slices/sessionSlice';
import { UserDeviceType } from '../../../store/slices/interfaces/session';
import {
  getElmsForPc,
  getElmsForPCExtendedVerticalView,
  setForMobileAndTablet,
  setForMobileLandscape,
} from './helpers/utils';
import { ColumnCameraPosition } from '../../../store/slices/interfaces/roomSettings';
import { ArrowRight } from '../../../assets/Icons/ArrowRight';
import { updateIsEnabledExtendedVerticalCamView } from '../../../store/slices/bottomIconsActivitySlice';

interface IVideosComponentElmsProps {
  allParticipants: React.JSX.Element[];
  pinParticipant?: React.JSX.Element;
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
  VERTICAL_PER_PAGE = 5,
  EXTENDED_VERTICAL_PER_PAGE = 10,
  VERTICAL_TOP_BOTTOM_PER_PAGE = 8,
  VERTICAL_TABLET_PORTRAIT = 5;

const VideosComponentElms = ({
  allParticipants,
  pinParticipant,
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
  const isActiveChatPanel = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveChatPanel,
  );
  const isActiveParticipantsPanel = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveParticipantsPanel,
  );
  const isEnabledExtendedVerticalCamView = useAppSelector(
    (state) => state.bottomIconsActivity.isEnabledExtendedVerticalCamView,
  );
  const deviceType = store.getState().session.userDeviceType;
  const isRecorder = store.getState().session.currentUser?.isRecorder;

  const [participantsToRender, setParticipantsToRender] = useState<
    Array<React.JSX.Element>
  >([]);
  const [webcamPerPage, setWebcamPerPage] = useState<number>(
    isVertical ? VERTICAL_PER_PAGE : DESKTOP_PER_PAGE,
  );

  const [currentPage, setCurrentPage] = useState<number>(0);
  const [isSmallScreen, setIsSmallScreen] = useState<boolean>(false);

  useEffect(() => {
    if (pinParticipant) {
      if (isVertical && isEnabledExtendedVerticalCamView) {
        // for pin cam needs to use one full row
        setWebcamPerPage(EXTENDED_VERTICAL_PER_PAGE - 2);
      } else {
        setWebcamPerPage(VERTICAL_PER_PAGE);
      }
    }
  }, [isEnabledExtendedVerticalCamView, isVertical, pinParticipant]);

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
      if (isEnabledExtendedVerticalCamView) {
        setWebcamPerPage(EXTENDED_VERTICAL_PER_PAGE);
      } else {
        setWebcamPerPage(VERTICAL_PER_PAGE);
      }

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
  }, [
    isVertical,
    isEnabledExtendedVerticalCamView,
    screenWidth,
    columnCameraPosition,
    deviceOrientation,
  ]);

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
      if (!isRecorder) {
        per_page--;
      }
      hasNextPage = true;
    } else {
      hasPrevPage = true;
      if (!isRecorder) {
        per_page--;
      }
      // so, we're in next page
      if (page_number >= totalNumWebcams / per_page) {
        hasNextPage = false;
      } else {
        if (!isRecorder) {
          per_page--;
        }
        hasNextPage = true;
      }
    }

    const display = allParticipants.slice(
      (page_number - 1) * per_page,
      page_number * per_page,
    );

    if (!isRecorder && hasNextPage) {
      display.push(
        <button
          role="button"
          className="video-camera-item webcam-next-page order-3 relative bg-Gray-900 text-white cursor-pointer flex items-end pb-4 pl-4"
          onClick={() => nextPage(page_number)}
        >
          {formatNextPreButton(allParticipants.slice(page_number * per_page))}
        </button>,
      );
    }
    if (!isRecorder && hasPrevPage) {
      display.splice(
        0,
        0,
        <button
          role="button"
          className="video-camera-item webcam-prev-page order-1 relative bg-Gray-900 text-white cursor-pointer flex items-end pb-4 pl-4"
          onClick={() => prePage(page_number)}
        >
          {formatNextPreButton(
            allParticipants.slice(-(page_number - 1) * per_page),
          )}
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
  const sliceFirstLetterOfText = (name: any) =>
    name
      .split(/\s+/) // Split the name by spaces
      .map((word: string[]) => word[0].toUpperCase()) // Get the first letter of each word in uppercase
      .join(''); // Join the initials into a string

  const formatNextPreButton = (remaining: React.JSX.Element[]) => {
    const shortName: React.JSX.Element[] = [];
    const fullName: React.JSX.Element[] = [];
    for (let i = 0; i < remaining.length; i++) {
      if (i === 2 && remaining.length > i) {
        // so,we have more
        shortName.push(
          <span className="inline-flex items-center justify-center order-2 pr-1 bg-[rgba(0,102,153,1)] rounded-[13px] border-2 border-Gray-900 w-10 h-10 -ml-2 overflow-hidden">
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
        <span className="inline-flex items-center justify-center order-1 pr-1 bg-[#003C59] rounded-[13px] border-2 border-Gray-900 w-10 h-10 -ml-2 overflow-hidden">
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
    if (isVertical || pinParticipant) {
      // both have same behavior
      if (!isEnabledExtendedVerticalCamView) {
        return participantsToRender;
      } else {
        return getElmsForPCExtendedVerticalView(participantsToRender);
      }
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
  }, [
    isVertical,
    isEnabledExtendedVerticalCamView,
    participantsToRender,
    deviceOrientation,
    pinParticipant,
  ]);

  const renderView = () => {
    if (!totalNumWebcams) {
      return null;
    }

    if (isVertical && pinParticipant) {
      // vertical + pinParticipant, so vertical view will lose on row
      return (
        <div
          className={`vertical-webcams-wrapper absolute right-0 top-0  bg-white h-full p-3 transition-all duration-300 z-20 ${isEnabledExtendedVerticalCamView ? 'w-[416px] flex flex-col justify-center extended-view-wrap' : 'w-[212px] not-extended'}`}
        >
          <div
            className={`inner row-count-${videoParticipantsElms.length} total-cam-${totalNumWebcams} group-total-cam-${participantsToRender.length} page-${currentPage} ${isEnabledExtendedVerticalCamView ? `flex gap-3 h-full flex-col justify-center` : 'h-full flex flex-col justify-center gap-3 bg-white z-20'}`}
          >
            <div className="pin-webcam-view">{pinParticipant}</div>
            {videoParticipantsElms}
          </div>
          {isActiveParticipantsPanel || isActiveChatPanel ? null : (
            <button
              onClick={() =>
                dispatch(
                  updateIsEnabledExtendedVerticalCamView(
                    !isEnabledExtendedVerticalCamView,
                  ),
                )
              }
              className="extend-button absolute top-1/2 -translate-y-1/2 left-0 w-4 h-6 rounded-l-full bg-DarkBlue flex items-center justify-center transition-all duration-300 opacity-0"
            >
              <span
                className={`${isEnabledExtendedVerticalCamView ? '' : 'rotate-180'}`}
              >
                <ArrowRight />
              </span>
            </button>
          )}
        </div>
      );
    } else if (isVertical) {
      // only normal vertical view without any pin cam
      return (
        <div
          className={`vertical-webcams-wrapper absolute right-0 top-0  bg-white h-full p-3 transition-all duration-300 z-20 ${isEnabledExtendedVerticalCamView ? 'w-[416px] flex flex-col justify-center extended-view-wrap' : 'w-[212px] not-extended'}`}
        >
          <div
            className={`inner row-count-${videoParticipantsElms.length} total-cam-${totalNumWebcams} group-total-cam-${participantsToRender.length} page-${currentPage} ${isEnabledExtendedVerticalCamView ? `flex gap-3 h-full flex-col justify-center` : 'h-full flex flex-col justify-center gap-3 bg-white z-20'}`}
          >
            {videoParticipantsElms}
          </div>
          {isActiveParticipantsPanel || isActiveChatPanel ? null : (
            <button
              onClick={() =>
                dispatch(
                  updateIsEnabledExtendedVerticalCamView(
                    !isEnabledExtendedVerticalCamView,
                  ),
                )
              }
              className="extend-button absolute top-1/2 -translate-y-1/2 left-0 w-4 h-6 rounded-l-full bg-DarkBlue flex items-center justify-center transition-all duration-300 opacity-0"
            >
              <span
                className={`${isEnabledExtendedVerticalCamView ? '' : 'rotate-180'}`}
              >
                <ArrowRight />
              </span>
            </button>
          )}
        </div>
      );
    } else if (pinParticipant) {
      // normal view + pinParticipant, so all other cameras will be in vertical view
      // pin cam will get full view
      // TODO: here need to write new layout
      console.log('here need to write new layout', pinParticipant);
      return (
        <>
          <div className={`pinView-camera-fullWidth w-full h-full p-4`}>
            {pinParticipant}
          </div>
          <div
            className={`vertical-webcams-wrapper absolute right-0 top-0  bg-white h-full p-3 transition-all duration-300 z-20 ${isEnabledExtendedVerticalCamView ? 'w-[416px] flex flex-col justify-center extended-view-wrap' : 'w-[212px] not-extended'}`}
          >
            <div
              className={`inner row-count-${videoParticipantsElms.length} total-cam-${totalNumWebcams} group-total-cam-${participantsToRender.length} page-${currentPage} ${isEnabledExtendedVerticalCamView ? `flex gap-3 h-full flex-col justify-center` : 'h-full flex flex-col justify-center gap-3 bg-white z-20'}`}
            >
              {videoParticipantsElms}
            </div>
            {isActiveParticipantsPanel || isActiveChatPanel ? null : (
              <button
                onClick={() =>
                  dispatch(
                    updateIsEnabledExtendedVerticalCamView(
                      !isEnabledExtendedVerticalCamView,
                    ),
                  )
                }
                className="extend-button absolute top-1/2 -translate-y-1/2 left-0 w-4 h-6 rounded-l-full bg-DarkBlue flex items-center justify-center transition-all duration-300 opacity-0"
              >
                <span
                  className={`${isEnabledExtendedVerticalCamView ? '' : 'rotate-180'}`}
                >
                  <ArrowRight />
                </span>
              </button>
            )}
          </div>
        </>
      );
    } else {
      return (
        <div
          className={`all-webcam-wrapper total-cam-${totalNumWebcams} selected-cam-${webcamPerPage} page-${currentPage}`}
        >
          <div className="all-webcam-wrapper-inner">
            {videoParticipantsElms}
          </div>
        </div>
      );
    }
  };

  return renderView();
};

export default VideosComponentElms;
