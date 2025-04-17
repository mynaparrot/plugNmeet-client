import React from 'react';

import { useAppSelector } from '../../../../store';
import { participantsSelector } from '../../../../store/slices/participantSlice';
import { Camera } from '../../../../assets/Icons/Camera';
// import { CameraOff } from '../../../../assets/Icons/CameraOff';

interface WebcamIconProps {
  userId: string;
}

const WebcamIcon = ({ userId }: WebcamIconProps) => {
  const videoTracks = useAppSelector(
    (state) => participantsSelector.selectById(state, userId)?.videoTracks,
  );

  return !videoTracks ? null : (
    <div className="mic cursor-pointer w-6 3xl:w-8 h-6 3xl:h-8 flex items-center justify-center">
      {/* <i className="pnm-webcam secondaryColor text-[10px]" /> */}
      <Camera classes={'h-3 3xl:h-4 w-auto'} />
    </div>
  );
};

export default WebcamIcon;
