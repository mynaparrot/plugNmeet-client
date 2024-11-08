import React, { useMemo } from 'react';

import { useAppSelector } from '../../../../store';
import { participantsSelector } from '../../../../store/slices/participantSlice';

interface IScreenShareIconProps {
  userId: string;
}

const ScreenShareIcon = ({ userId }: IScreenShareIconProps) => {
  const screenShareTrack = useAppSelector(
    (state) => participantsSelector.selectById(state, userId)?.screenShareTrack,
  );

  const render = useMemo(() => {
    if (screenShareTrack) {
      return (
        <div className="screen-share cursor-pointer w-8 h-8 flex items-center justify-center">
          <i className="pnm-screen-share text-Gray-950 text-sm" />
        </div>
      );
    }
    return null;
  }, [screenShareTrack]);

  return <>{render}</>;
};

export default ScreenShareIcon;
