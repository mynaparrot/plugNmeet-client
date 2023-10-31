import React, { useMemo } from 'react';

import { useAppSelector } from '../../../../store';
import { participantsSelector } from '../../../../store/slices/participantSlice';

interface WebcamIconProps {
  userId: string;
}

const WebcamIcon = ({ userId }: WebcamIconProps) => {
  const participant = useAppSelector((state) =>
    participantsSelector.selectById(state, userId),
  );

  const render = useMemo(() => {
    if (participant?.videoTracks) {
      return (
        <div className="mic ltr:mr-2 rtl:ml-2 cursor-pointer">
          <i className="pnm-webcam secondaryColor text-[10px]" />
        </div>
      );
    }
    return null;
  }, [participant?.videoTracks]);

  return <>{render}</>;
};

export default WebcamIcon;
