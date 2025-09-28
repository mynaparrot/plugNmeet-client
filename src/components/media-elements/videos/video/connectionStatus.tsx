import React, { useMemo } from 'react';
import { ConnectionQuality } from 'livekit-client';

import { useAppSelector } from '../../../../store';
import { participantsSelector } from '../../../../store/slices/participantSlice';

interface IConnectionStatusProps {
  userId: string;
}
const ConnectionStatus = ({ userId }: IConnectionStatusProps) => {
  const connectionQuality = useAppSelector(
    (state) =>
      participantsSelector.selectById(state, userId)?.connectionQuality,
  );

  const color = useMemo(() => {
    switch (connectionQuality) {
      case ConnectionQuality.Excellent:
        return '#38f105';
      case ConnectionQuality.Good:
        return '#c8f6bd';
      case ConnectionQuality.Poor:
        return '#FF0000';
      case ConnectionQuality.Lost:
        return '#e03131';
      default:
        return '#FFFFFF';
    }
  }, [connectionQuality]);

  return (
    <div className="connection-status cursor-pointer w-7 h-7 rounded-full bg-Gray-950/50 shadow-shadowXS flex items-center justify-center">
      <i style={{ color: color }} className="pnm-network text-[7px]" />
    </div>
  );
};

export default ConnectionStatus;
