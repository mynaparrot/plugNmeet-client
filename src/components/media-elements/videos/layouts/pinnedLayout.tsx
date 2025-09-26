import React, { ReactElement } from 'react';

import VerticalLayout from './verticalLayout';

interface IPinnedLayoutProps {
  participantsToRender: Array<ReactElement>;
  pinParticipant: ReactElement;
  totalNumWebcams: number;
  currentPage: number;
}

const PinnedLayout = ({
  participantsToRender,
  pinParticipant,
  totalNumWebcams,
  currentPage,
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
      />
    </>
  );
};

export default PinnedLayout;
