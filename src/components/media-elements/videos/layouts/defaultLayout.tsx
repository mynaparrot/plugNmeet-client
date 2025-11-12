import React, { ReactElement } from 'react';

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
  return (
    <div
      className={`all-webcam-wrapper total-cam-${totalNumWebcams} selected-cam-${webcamPerPage} page-${currentPage}`}
    >
      <div className="all-webcam-wrapper-inner">{participantsToRender}</div>
    </div>
  );
};

export default DefaultLayout;
