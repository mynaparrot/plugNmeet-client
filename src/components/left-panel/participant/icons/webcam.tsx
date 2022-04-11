import React from 'react';

import { useAppSelector } from '../../../../store';
import { participantsSelector } from '../../../../store/slices/participantSlice';

interface WebcamIconProps {
  userId: string;
}

const WebcamIcon = ({ userId }: WebcamIconProps) => {
  const participant = useAppSelector((state) =>
    participantsSelector.selectById(state, userId),
  );

  const render = () => {
    if (participant?.videoTracks) {
      return (
        <div className="mic mr-2 cursor-pointer">
          <i className="pnm-webcam secondaryColor opacity-50 text-[8px]" />
        </div>
      );
    }
    return null;
  };

  return <React.Fragment>{render()}</React.Fragment>;
};

export default WebcamIcon;
