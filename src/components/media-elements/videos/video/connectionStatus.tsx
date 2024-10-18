import React, { useEffect, useState } from 'react';
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
  const [color, setColor] = useState<string>('#FFFFFF');

  useEffect(() => {
    switch (connectionQuality) {
      case ConnectionQuality.Excellent:
        setColor('#38f105');
        break;
      case ConnectionQuality.Good:
        setColor('#c8f6bd');
        break;
      case ConnectionQuality.Poor:
        setColor('#FF0000');
        break;
      case ConnectionQuality.Lost:
        setColor('#e03131');
        break;
      default:
        setColor('#FFFFFF');
    }
  }, [connectionQuality]);

  return (
    <div className="connection-status">
      <i style={{ color: color }} className="pnm-network text-[7px]" />
    </div>
  );
};

export default ConnectionStatus;
