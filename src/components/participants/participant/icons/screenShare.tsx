import React from 'react';

import { useAppSelector } from '../../../../store';
import { participantsSelector } from '../../../../store/slices/participantSlice';

interface IScreenShareIconProps {
  userId: string;
}

const ScreenShareIcon = ({ userId }: IScreenShareIconProps) => {
  const screenShareTrack = useAppSelector(
    (state) => participantsSelector.selectById(state, userId)?.screenShareTrack,
  );

  return !screenShareTrack ? null : (
    <div className="screen-share cursor-pointer w-6 3xl:w-8 h-6 3xl:h-8 flex items-center justify-center">
      <i className="pnm-screen-share text-Gray-950 text-[10px] 3xl:text-sm" />
    </div>
  );
};

export default ScreenShareIcon;
