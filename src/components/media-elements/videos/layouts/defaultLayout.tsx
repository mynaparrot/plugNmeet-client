import React, { ReactElement, useMemo } from 'react';

import { store, useAppSelector } from '../../../../store';
import { UserDeviceType } from '../../../../store/slices/interfaces/session';
import {
  getElmsForPc,
  setForMobileAndTablet,
  setForMobileLandscape,
} from '../helpers/utils';

interface IDefaultLayoutProps {
  participantsToRender: Array<ReactElement>;
  totalNumWebcams: number;
  webcamPerPage: number;
  currentPage: number;
}

const DefaultLayout = ({
  participantsToRender,
  totalNumWebcams,
  webcamPerPage,
  currentPage,
}: IDefaultLayoutProps) => {
  const deviceType = store.getState().session.userDeviceType;
  const deviceOrientation = useAppSelector(
    (state) => state.bottomIconsActivity.deviceOrientation,
  );

  const videoParticipantsElms = useMemo(() => {
    let elms: Array<ReactElement>;

    if (
      deviceType === UserDeviceType.MOBILE &&
      deviceOrientation === 'landscape'
    ) {
      elms = setForMobileLandscape(participantsToRender);
    } else if (
      deviceType === UserDeviceType.MOBILE ||
      deviceType === UserDeviceType.TABLET
    ) {
      elms = setForMobileAndTablet(participantsToRender);
    } else {
      elms = getElmsForPc(participantsToRender);
    }

    return elms;
  }, [participantsToRender, deviceOrientation, deviceType]);

  return (
    <div
      className={`all-webcam-wrapper total-cam-${totalNumWebcams} selected-cam-${webcamPerPage} page-${currentPage}`}
    >
      <div className="all-webcam-wrapper-inner">{videoParticipantsElms}</div>
    </div>
  );
};

export default DefaultLayout;
