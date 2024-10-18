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
        <div className="screen-share ltr:mr-2 rtl:ml-2 cursor-pointer">
          <i className="pnm-screen-share secondaryColor text-[10px]" />
        </div>
      );
    }
    return null;
  }, [screenShareTrack]);

  return <>{render}</>;
};

export default ScreenShareIcon;
