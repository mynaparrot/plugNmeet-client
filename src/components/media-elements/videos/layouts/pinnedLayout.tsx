import React, { ReactElement } from 'react';

import VerticalLayout from './verticalLayout';

interface IPinnedLayoutProps {
  participantsToRender: Array<ReactElement>;
  pinParticipant: ReactElement;
  totalNumWebcams: number;
  currentPage: number;
  isSidebarOpen: boolean;
  isEnabledExtendedVerticalCamView: boolean;
  isDesktop: boolean;
}

const PinnedLayout = ({
  participantsToRender,
  pinParticipant,
  totalNumWebcams,
  currentPage,
  isSidebarOpen,
  isEnabledExtendedVerticalCamView,
  isDesktop,
}: IPinnedLayoutProps) => {
  return (
    <>
      <div className="pinView-camera-fullWidth w-full h-full p-4">
        {pinParticipant}
      </div>
      <VerticalLayout
        participantsToRender={participantsToRender}
        totalNumWebcams={totalNumWebcams}
        currentPage={currentPage}
        isSidebarOpen={isSidebarOpen}
        isEnabledExtendedVerticalCamView={isEnabledExtendedVerticalCamView}
        isDesktop={isDesktop}
      />
    </>
  );
};

export default PinnedLayout;
