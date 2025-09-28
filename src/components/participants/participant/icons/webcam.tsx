import React from 'react';

import { useAppSelector } from '../../../../store';
import { participantsSelector } from '../../../../store/slices/participantSlice';
import IconWrapper from './iconWrapper';
import { Camera } from '../../../../assets/Icons/Camera';

// import { CameraOff } from '../../../../assets/Icons/CameraOff';

interface WebcamIconProps {
  userId: string;
}

const WebcamIcon = ({ userId }: WebcamIconProps) => {
  const videoTracks = useAppSelector(
    (state) => participantsSelector.selectById(state, userId)?.videoTracks,
  );

  return (
    videoTracks > 0 && (
      <IconWrapper>
        <Camera classes={'h-3 3xl:h-4 w-auto'} />
      </IconWrapper>
    )
  );
};

export default WebcamIcon;
