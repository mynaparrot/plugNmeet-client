import React, { useEffect, useState } from 'react';
import { ConnectionQuality } from 'livekit-client';
import { useAppSelector } from '../../../../store';
import { participantsSelector } from '../../../../store/slices/participantSlice';

interface IConnectionStatusProps {
  userId: string;
}
const ConnectionStatus = ({ userId }: IConnectionStatusProps) => {
  const participant = useAppSelector((state) =>
    participantsSelector.selectById(state, userId),
  );
  const [color, setColor] = useState<string>('#FFFFFF');

  useEffect(() => {
    switch (participant?.connectionQuality) {
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
  }, [participant?.connectionQuality]);

  const render = () => {
    return <i style={{ color: color }} className="pnm-network text-[7px]" />;
  };

  return <div className="connection-status">{render()}</div>;
};

export default ConnectionStatus;
