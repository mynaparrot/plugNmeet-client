import React, { useCallback, useEffect, useState } from 'react';

import { useAppDispatch, useAppSelector } from '../../../../store';
import { updatePinCamUserId } from '../../../../store/slices/roomSettingsSlice';

interface IPinWebcamProps {
  userId: string;
}

const PinWebcam = ({ userId }: IPinWebcamProps) => {
  const dispatch = useAppDispatch();
  const pinCamUserId = useAppSelector(
    (state) => state.roomSettings.pinCamUserId,
  );
  const [isPinCamActive, setIsPinCamActive] = useState<boolean>(false);

  useEffect(() => {
    setIsPinCamActive(!!(pinCamUserId && pinCamUserId === userId));
  }, [pinCamUserId, userId]);

  const togglePin = useCallback(() => {
    dispatch(updatePinCamUserId(isPinCamActive ? undefined : userId));
  }, [isPinCamActive, userId, dispatch]);

  return (
    <div
      className="pin-webcam cursor-pointer w-7 h-7 rounded-full bg-Gray-950/50 shadow-shadowXS flex items-center justify-center"
      onClick={togglePin}
    >
      {isPinCamActive ? (
        <i className="pnm-pin text-white text-[12px]" />
      ) : (
        <i className="pnm-pin -rotate-90 text-white text-[12px]" />
      )}
    </div>
  );
};

export default PinWebcam;
